# 智能医疗耗材管理系统

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Ant Design 5 + ECharts + Redux Toolkit |
| 后端 | Spring Boot 3.2 + Spring Security + JWT + JPA |
| 数据库 | PostgreSQL 15 |
| 缓存 | Redis 7 |
| 容器化 | Docker + Docker Compose |

## 快速启动

### 方式一：Docker Compose（推荐）

```bash
cd ~/Desktop/medical-system
docker-compose up -d
```

访问地址：http://localhost

### 方式二：本地开发

**1. 启动数据库**
```bash
docker-compose up -d postgres redis
```

**2. 启动后端**
```bash
cd backend
mvn spring-boot:run
# 后端运行在 http://localhost:8080
```

**3. 启动前端**
```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:3000
```

## 默认账户

| 账户 | 密码 | 角色 |
|------|------|------|
| admin | Admin@123456 | 系统管理员 |
| nurse1 | Admin@123456 | 护士长 |
| keeper1 | Admin@123456 | 库管员 |

## 功能模块（MVP）

- ✅ 用户认证（JWT）+ RBAC 权限管理
- ✅ 耗材字典管理（增删改查、分类、库存预警）
- ✅ 库存管理（入库、出库、预警提醒）
- ✅ 申领管理（发起、提交、审批、发放）
- ✅ 系统管理（用户、角色、科室、供应商）
- ✅ Dashboard（统计卡片、趋势图、预警）

## API 文档

后端启动后访问：http://localhost:8080/swagger-ui.html（如配置 SpringDoc）

## 项目结构

```
medical-system/
├── backend/          # Spring Boot 后端
│   ├── src/main/java/com/medical/system/
│   │   ├── controller/   # REST 控制器
│   │   ├── service/      # 业务逻辑
│   │   ├── repository/   # 数据访问层
│   │   ├── entity/       # JPA 实体
│   │   ├── dto/          # 请求/响应 DTO
│   │   ├── security/     # JWT 安全配置
│   │   └── config/       # 全局配置
│   └── src/main/resources/
│       └── db/migration/ # Flyway 数据库迁移脚本
├── frontend/         # React 前端
│   └── src/
│       ├── api/      # API 调用层
│       ├── pages/    # 页面组件
│       ├── store/    # Redux 状态管理
│       ├── router/   # 路由配置
│       └── types/    # TypeScript 类型定义
└── docker-compose.yml
```
