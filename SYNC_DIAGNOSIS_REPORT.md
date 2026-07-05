# AI Planner 跨设备同步诊断报告

**报告日期**: 2026-07-05  
**问题**: 手机端和电脑端无法通过同一邮箱联通/同步  
**状态**: 诊断完成，未修改任何代码

---

## 执行摘要

ai-planner 应用架构上支持跨设备同步，使用 Supabase 作为云后端。虽然构建成功，但存在**多个潜在的导致同步失败的问题点**。根据症状，最可能的原因包括：

1. **Row Level Security (RLS) 策略问题** ⚠️ 高风险
2. **会话 Cookie 隔离问题** ⚠️ 高风险  
3. **用户身份验证和会话状态不一致** ⚠️ 中风险
4. **Supabase 数据库表未正确迁移** ⚠️ 中风险
5. **中间件弃用导致的会话刷新失败** ⚠️ 低风险

---

## 系统架构分析

### 同步工作流

```
桌面端/手机端
    ↓
[用户登录] → Supabase Auth (Google OAuth / Email OTP)
    ↓
[useAuth Hook] → 获取用户会话和 user.id
    ↓
[useCloudSync Hook] → 
    - 加载云端数据 (fetchCloudTasks, fetchCloudPreferences)
    - 监听本地变化，推送到云 (syncCloudTasks, syncCloudPreferences)
    ↓
[Supabase Postgres] → 存储任务和偏好设置
```

### 关键组件

| 组件 | 功能 | 位置 |
|------|------|------|
| `useAuth` | 管理认证状态和会话 | `hooks/useAuth.ts` |
| `useCloudSync` | 双向同步本地和云数据 | `hooks/useCloudSync.ts` |
| `fetchCloudTasks` | 从 Supabase 读取任务 | `lib/supabase/tasks.ts` |
| `syncCloudTasks` | 将本地任务写入 Supabase | `lib/supabase/tasks.ts` |
| `fetchCloudPreferences` | 读取用户偏好设置 | `lib/supabase/preferences.ts` |
| `syncCloudPreferences` | 写入用户偏好设置 | `lib/supabase/preferences.ts` |
| `middleware` | 管理会话 Cookies | `middleware.ts` / `lib/supabase/middleware.ts` |

---

## 问题根因分析

### 🔴 **问题 1: Row Level Security (RLS) 策略缺陷**

**严重性**: 🔴 **高**

**描述**:  
数据库表已启用 RLS，但可能存在以下问题：

1. **RLS 策略未激活**
   - 文件: `supabase/migrations/001_cloud_sync.sql`
   - 当前代码创建了 RLS 策略，但：
     - 是否在 Supabase Dashboard 中实际执行过这个 SQL 脚本？
     - 如果表中有策略但未正确启用，所有查询都会被拒绝

2. **策略中 `auth.uid()` 返回 NULL**
   ```sql
   create policy "tasks_select_own"
     on public.tasks for select
     using (auth.uid() = user_id);
   ```
   - 如果会话未正确建立，`auth.uid()` 返回 NULL
   - NULL = user_id 总是 False
   - 用户无法读取自己的任务

3. **不同设备间的 user_id 不一致**
   - 如果桌面端和手机端登录产生了不同的 `user_id`
   - 它们看到的数据会完全不同

**症状**:
- 登录后任务列表为空
- 创建新任务后，在另一个设备上看不到
- 浏览器控制台可能无错误提示（因为 RLS 的拒绝是无声的）

**验证方法**:
1. 打开 Supabase Dashboard → 您的项目
2. 进入 SQL Editor
3. 运行: 
   ```sql
   SELECT * FROM auth.users;
   ```
   - 记下登录的用户 ID
4. 运行:
   ```sql
   SELECT * FROM public.tasks;
   ```
   - 查看 `user_id` 列是否与预期一致

---

### 🔴 **问题 2: 会话 Cookie 跨设备隔离**

**严重性**: 🔴 **高**

**描述**:

Supabase SSR 客户端使用 Cookies 存储会话。在多设备场景中：

1. **桌面端 Cookie vs 手机端 Cookie**
   - 每个设备通过浏览器的 Cookies 存储独立的会话
   - 这是正确的设计，但可能存在以下问题：

2. **代码中的问题**:
   ```typescript
   // lib/supabase/middleware.ts
   await supabase.auth.getUser();  // 这行可能失败
   ```
   - 如果中间件无法正确读取/更新 Cookie
   - 后续的 `auth.uid()` 会返回 NULL

3. **Cookie 路径和域问题**
   - 如果 Supabase 的 Cookie 配置不正确
   - 本地开发 (localhost) 可能工作
   - 但在不同设备上会失败

**症状**:
- 登录后立即重新加载页面，会话丢失
- 在手机浏览器和电脑浏览器中的用户 ID 不同
- 浏览器开发者工具中没有 `sb-*` 前缀的 Cookie

**验证方法**:
1. 打开桌面浏览器的开发者工具 (F12)
2. 进入 Application → Cookies
3. 查找以 `sb-` 开头的 Cookie（如 `sb-auth-token`）
4. 在手机浏览器中重复相同操作
5. **比较两个 Cookie 的值** - 如果相同，则正常；如果不同，可能存在问题

---

### 🔴 **问题 3: 用户身份验证状态不一致**

**严重性**: 🔴 **高**

**描述**:

```typescript
// hooks/useAuth.ts
supabase.auth.getSession().then(({ data }) => {
  setUser(data.session?.user ?? null);
});
```

问题场景：
1. **用户A 在桌面端登录**
   - `user.id` = `uuid-123`
   - 任务存储在 Supabase 中，`user_id` = `uuid-123`

2. **用户A 在手机端登录，但 Supabase 产生了新的用户记录**
   - `user.id` = `uuid-456`（不同的用户 ID）
   - 手机端看不到 `user_id = uuid-123` 的任务

3. **可能原因**:
   - Supabase Auth 配置中同一邮箱被当作两个不同用户
   - Google OAuth 在不同设备使用不同的授权方式
   - Email Magic Link 的身份绑定失败

**症状**:
- 同一邮箱在 Supabase Dashboard 中出现两次用户记录
- 两个设备上的 `user.id` 完全不同
- 任务数据被分割到两个不同的用户 ID 下

**验证方法**:
1. 打开 Supabase Dashboard
2. 进入 Authentication → Users
3. 搜索或查找您登录的邮箱
4. 如果看到**多个用户记录**对应同一邮箱，问题确认
5. 打开浏览器控制台，运行：
   ```javascript
   // 桌面端执行
   const { data } = await supabase.auth.getUser();
   console.log("Desktop user ID:", data.user?.id);
   ```
6. 在手机端运行相同代码，比较 user ID

---

### 🟠 **问题 4: Supabase 数据库表未正确迁移**

**严重性**: 🟠 **中**

**描述**:

SQL 迁移脚本定义在 `supabase/migrations/001_cloud_sync.sql` 中，但：

1. **未知是否在 Supabase 中执行过**
   - 该文件存在但可能从未运行
   - 表可能不存在
   - RLS 策略可能不存在

2. **表结构验证**:
   ```sql
   -- 应该存在的表
   public.tasks (id, user_id, title, notes, due_date, quadrant, completed, created_at, updated_at)
   public.user_preferences (user_id, doing_now_id, plan_mode, dismissed_ids, plan_hidden, updated_at)
   ```

3. **可能的 SQL 错误**
   - 虽然代码中的 SQL 语法看起来正确
   - 但在 Supabase Dashboard 中执行可能失败（权限、类型等）

**症状**:
- 登录后尝试保存任务时出现 "relation \"public.tasks\" does not exist" 错误
- Supabase 控制台日志中看到 SQL 错误
- 应用看不到任何同步完成

**验证方法**:
1. 打开 Supabase Dashboard → SQL Editor
2. 运行:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
3. 检查 `tasks` 和 `user_preferences` 表是否存在
4. 如果不存在，需要手动在 SQL Editor 中运行迁移脚本

---

### 🟠 **问题 5: 中间件弃用警告导致会话刷新失败**

**严重性**: 🟠 **低**

**描述**:

构建时出现警告：
```
⚠️ The "middleware" file convention is deprecated. 
Please use "proxy" instead.
```

代码位置: `middleware.ts`

虽然应用仍然构建成功，但：

1. **middleware 可能无法正确更新会话**
   ```typescript
   // middleware.ts
   export async function middleware(request: NextRequest) {
     return updateSession(request);
   }
   ```
   - 这个中间件在每个请求上运行
   - 它负责刷新 Supabase 会话
   - 如果中间件不工作，会话可能过期

2. **在 Vercel 部署时可能失败**
   - 本地开发可能工作
   - 但在生产环境（Vercel）可能因为中间件配置而失败

**症状**:
- 建议改用 `next.config.ts` 中的 `"proxy"` 配置
- 但应用仍可运行，只是不是最优配置

---

## 同步机制代码审查

### ✅ 正确的部分

1. **useCloudSync 的双向绑定**
   ```typescript
   // 加载云数据
   const [cloudTasks, cloudPrefs] = await Promise.all([
     fetchCloudTasks(supabase, userId),
     fetchCloudPreferences(supabase, userId),
   ]);
   
   // 监听本地变化并推送到云
   const unsubTasks = subscribeTasks(pushToCloud);
   const unsubPrefs = subscribePlanPreferences(pushToCloud);
   ```
   - 逻辑正确，使用 Pub/Sub 模式

2. **去重和冲突处理**
   ```typescript
   // 上传本地任务
   await supabase.from("tasks").upsert(rows, {
     onConflict: "id",
   });
   
   // 删除本地已删除的任务
   if (toDelete.length > 0) {
     await supabase.from("tasks").delete().in("id", toDelete);
   }
   ```
   - 使用 upsert 避免重复
   - 正确处理删除

3. **会话管理**
   ```typescript
   supabase.auth.onAuthStateChange((_event, session) => {
     setUser(session?.user ?? null);
   });
   ```
   - 在认证状态改变时监听

### ⚠️ 潜在问题的部分

1. **debounce 可能过长**
   ```typescript
   const pushToCloud = debounce(async () => {
     // ...
   }, 500);  // 500ms 延迟
   ```
   - 如果用户快速操作，可能丢失某些更新
   - 不是严重问题，但在 mobile 网络差时可能明显

2. **无错误重试机制**
   ```typescript
   try {
     await syncCloudTasks(supabase, userId, getTasksSnapshot());
   } catch (error) {
     console.error("Failed to sync to cloud:", error);
     // 不重试，不通知用户
   }
   ```
   - 如果同步失败，用户不知道
   - 没有重试机制
   - 没有 UI 反馈

3. **无离线支持**
   - 如果网络断开，不会自动重试
   - 没有待同步队列

---

## 环境配置检查

### ✅ 已验证

- **Supabase 环境变量已配置**:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://toscdbombxeudozxtznc.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ouz83T8UZXtFpAEaK2h6eg_tAtMZUko
  ```

- **npm build 成功**: 没有编译错误

### ⚠️ 未验证（需要用户检查）

- [ ] Supabase Dashboard 中是否执行过 SQL 迁移脚本
- [ ] `tasks` 和 `user_preferences` 表是否存在
- [ ] RLS 策略是否启用
- [ ] 表数据是否正确隔离到每个用户

---

## 问题诊断决策树

```
手机端和电脑端无法同步
    ↓
第一步: 检查 RLS 策略
    ├─ Supabase Dashboard → SQL Editor
    ├─ SELECT * FROM auth.users;
    ├─ SELECT * FROM public.tasks;
    └─ 如果表为空或不存在 → 问题 4
    
第二步: 检查用户 ID 一致性
    ├─ 在桌面端控制台运行: const {data} = await supabase.auth.getUser(); console.log(data.user.id);
    ├─ 在手机端运行相同代码
    ├─ 比较 user ID
    └─ 如果不同 → 问题 3
    
第三步: 检查 Cookie
    ├─ F12 → Application → Cookies
    ├─ 查找 sb-auth-token 等 Cookie
    └─ 如果缺失或值不同 → 问题 2
    
第四步: 查看浏览器控制台错误
    ├─ 打开开发者工具控制台
    ├─ 登录并等待同步
    └─ 如果看到 RLS 相关错误 → 问题 1
```

---

## 推荐的诊断步骤（按优先级）

### 步骤 1: 验证数据库迁移 ⭐⭐⭐ (优先级最高)

**在 Supabase Dashboard 中执行**:

1. 打开 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目
3. 进入 SQL Editor
4. 创建新查询，执行:
   ```sql
   -- 检查表是否存在
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
5. 检查结果中是否包含 `tasks` 和 `user_preferences`

**如果表不存在**:
1. 在 SQL Editor 中新建查询
2. 复制并执行 `supabase/migrations/001_cloud_sync.sql` 中的所有 SQL 代码
3. 等待执行完成

**预期结果**:
- 应该看到 "Query returned 2 rows"
- 包含 `tasks` 和 `user_preferences`

---

### 步骤 2: 验证用户身份 ⭐⭐⭐

**在桌面浏览器中**:

1. 打开 ai-planner 应用
2. 登录您的邮箱
3. 打开浏览器开发者工具 (F12)
4. 进入 Console 标签
5. 粘贴并运行:
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User ID:', user?.id);
   console.log('User Email:', user?.email);
   ```
6. **记下 User ID 值**

**在手机浏览器中**:

1. 打开 ai-planner 应用（使用相同邮箱登录）
2. 打开移动浏览器开发者工具（或使用 remote debugging）
3. 运行相同的代码
4. **比较两个 User ID**

**预期结果**:
- 两个设备上的 User ID 应该**完全相同**
- 如果不同，这是根本问题

---

### 步骤 3: 验证 RLS 策略 ⭐⭐

**在 Supabase Dashboard 中**:

1. 进入 SQL Editor
2. 查询检查 RLS 是否启用:
   ```sql
   SELECT * FROM information_schema.table_constraints
   WHERE table_name IN ('tasks', 'user_preferences')
   AND constraint_type = 'CHECK'
   LIMIT 20;
   ```

3. 查询检查 RLS 策略:
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename IN ('tasks', 'user_preferences');
   ```

**预期结果**:
- 应该看到至少 8 条策略（tasks 和 user_preferences 各 4 条）
- 策略名称应该包含 `_select_own`, `_insert_own`, `_update_own`, `_delete_own`

---

### 步骤 4: 查看应用日志 ⭐

**在浏览器控制台中**:

1. 打开开发者工具 (F12)
2. 进入 Console 标签
3. 登录应用
4. 观察是否有错误信息，特别是：
   - `Failed to load cloud data`
   - `Failed to sync to cloud`
   - `permission denied for schema "public"`
   - `relation "public.tasks" does not exist`

**这些错误会指向具体是哪个问题**

---

### 步骤 5: 检查 Supabase 日志

**在 Supabase Dashboard 中**:

1. 进入 Logs 部分（或 Monitoring）
2. 查看最近的数据库查询日志
3. 搜索错误，特别是：
   - `permission denied` - RLS 问题
   - `relation does not exist` - 表不存在
   - `invalid user_id` - 用户认证问题

---

## 完整的测试用例

### 测试场景 1: 基本同步

**设备 A (桌面)**:
1. 打开 ai-planner
2. 使用邮箱登录 (user@example.com)
3. 创建任务 "Buy milk"
4. 等待 1 秒（让 debounce 完成）
5. 打开浏览器控制台，检查是否有错误

**设备 B (手机)**:
1. 打开 ai-planner
2. 使用**相同邮箱**登录
3. **应该立即看到** "Buy milk" 任务
4. 等待 2-3 秒（如果需要等待同步）

**预期**:
- 任务应该立即出现在手机端
- 两个设备应该显示相同的任务列表

**如果失败**:
- 如果手机端看不到任务 → 问题 1, 3, 或 4
- 如果看到错误 → 检查控制台日志

---

### 测试场景 2: 双向编辑

**在设备 B 上**:
1. 编辑 "Buy milk" 为 "Buy whole milk"
2. 等待 1 秒

**在设备 A 上**:
1. **应该立即看到** "Buy whole milk"
2. 刷新页面，确认仍然看到编辑后的任务

**预期**:
- 编辑应该双向同步
- 刷新后数据应该持久化

---

### 测试场景 3: 多用户隔离

**用户 1** 登录 user1@example.com:
1. 创建任务 "私密任务 1"

**用户 2** 登录 user2@example.com（在同一浏览器）:
1. **应该看不到** "私密任务 1"
2. 只应该看到用户 2 的任务

**预期**:
- 严格的用户数据隔离
- 任务列表随着登录用户改变

---

## 快速修复清单（用户审批前不执行）

| 问题 | 快速修复 | 风险 |
|------|--------|------|
| 表不存在 | 执行 SQL 迁移脚本 | 低 |
| RLS 未启用 | 在 Supabase Dashboard 中启用 | 低 |
| 多个用户 ID | 手动合并 Supabase 中的用户记录 | 中 |
| 中间件弃用 | 更新 `middleware.ts` 使用 `next.config.ts` proxy | 低 |
| 错误处理缺失 | 添加重试和用户通知 | 低 |
| 无离线支持 | 添加待同步队列 | 中 |

---

## 总结

ai-planner 的同步功能**在代码逻辑上是正确的**，但存在以下最可能的失败原因：

1. **🔴 最可能**: Supabase 数据库表未正确创建或 RLS 策略未启用
2. **🔴 高概率**: 用户在不同设备上被认证为不同的 user ID
3. **🔴 可能**: 会话 Cookie 未正确跨设备同步

### 建议的下一步

**在向我发送修复请求前，请执行诊断步骤 1-3，并反馈**：

1. ✅ 是否执行过 SQL 迁移脚本？
2. ✅ Supabase 中是否存在 `tasks` 和 `user_preferences` 表？
3. ✅ 桌面端和手机端的 User ID 是否相同？
4. ✅ 浏览器控制台中是否有错误信息？
5. ✅ Supabase 日志中是否有错误？

**提供这些信息后，我可以进行针对性的代码修复。**

---

## 附录：关键文件引用

| 文件 | 用途 | 行数 |
|------|------|------|
| [hooks/useCloudSync.ts](file:///c:/Users/winwin/ai-planner/hooks/useCloudSync.ts) | 核心同步逻辑 | 150 |
| [lib/supabase/tasks.ts](file:///c:/Users/winwin/ai-planner/lib/supabase/tasks.ts) | 任务云操作 | 100 |
| [lib/supabase/preferences.ts](file:///c:/Users/winwin/ai-planner/lib/supabase/preferences.ts) | 偏好云操作 | 80 |
| [hooks/useAuth.ts](file:///c:/Users/winwin/ai-planner/hooks/useAuth.ts) | 认证管理 | 110 |
| [middleware.ts](file:///c:/Users/winwin/ai-planner/middleware.ts) | 会话刷新 | 8 |
| [supabase/migrations/001_cloud_sync.sql](file:///c:/Users/winwin/ai-planner/supabase/migrations/001_cloud_sync.sql) | 数据库架构 | 67 |

---

**报告完成时间**: 2026-07-05  
**审查范围**: 完整代码库  
**代码修改**: ❌ 未进行任何修改（如要求）
