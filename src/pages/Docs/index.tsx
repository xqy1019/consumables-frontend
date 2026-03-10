import React, { useState } from 'react'
import {
  Card, Tabs, Typography, Tag, Timeline, Table, Badge,
  Space, Divider, Row, Col, Descriptions, Steps, theme,
} from 'antd'
import {
  DatabaseOutlined, FileTextOutlined, ShoppingCartOutlined,
  QrcodeOutlined, RobotOutlined, BarChartOutlined, SettingOutlined,
  SafetyCertificateOutlined, AlertOutlined, TeamOutlined,
  CheckCircleOutlined, ClockCircleOutlined, SyncOutlined,
  StopOutlined, MedicineBoxOutlined, ApartmentOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

// ─── 通用流程节点组件 ─────────────────────────────────────────────────────────
interface FlowNodeProps {
  label: string
  sublabel?: string
  color?: string
  shape?: 'rect' | 'diamond' | 'oval'
  icon?: React.ReactNode
}

const FlowNode: React.FC<FlowNodeProps> = ({ label, sublabel, color = '#6366f1', shape = 'rect', icon }) => {
  const { token } = theme.useToken()

  if (shape === 'diamond') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 100, height: 100,
          background: color, transform: 'rotate(45deg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <span style={{ transform: 'rotate(-45deg)', color: '#fff', fontSize: 13, textAlign: 'center', padding: 4, fontWeight: 600 }}>
            {label}
          </span>
        </div>
      </div>
    )
  }

  if (shape === 'oval') {
    return (
      <div style={{
        background: color, borderRadius: 24, padding: '8px 20px',
        color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}
        {label}
      </div>
    )
  }

  return (
    <div style={{
      background: color, borderRadius: 8, padding: '10px 16px',
      color: '#fff', minWidth: 120, textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: `1px solid ${color}`,
    }}>
      {icon && <div style={{ fontSize: 16, marginBottom: 2 }}>{icon}</div>}
      <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
      {sublabel && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{sublabel}</div>}
    </div>
  )
}

const Arrow: React.FC<{ label?: string }> = ({ label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
    <div style={{ width: 2, height: 20, background: '#94a3b8' }} />
    {label && <Text style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>{label}</Text>}
    <ArrowDownOutlined style={{ color: '#94a3b8', fontSize: 14 }} />
  </div>
)

const FlowCol: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
    {children}
  </div>
)

// ─── 申领流程图 ────────────────────────────────────────────────────────────────
const RequisitionFlow: React.FC = () => (
  <div style={{ padding: 24, background: '#f8fafc', borderRadius: 12 }}>
    <Title level={5} style={{ textAlign: 'center', marginBottom: 24 }}>申领管理业务流程</Title>
    <FlowCol>
      <FlowNode label="开始" shape="oval" color="#10b981" />
      <Arrow />
      <FlowNode label="科室人员创建申领单" sublabel="填写耗材、数量" color="#6366f1" icon={<FileTextOutlined />} />
      <Arrow label="保存" />
      <FlowNode label="提交申领" sublabel="状态: DRAFT → SUBMITTED" color="#8b5cf6" />
      <Arrow />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <FlowNode label="科室主任审批" shape="diamond" color="#f59e0b" />
        <div style={{ display: 'flex', gap: 80, marginTop: 8 }}>
          <FlowCol>
            <Tag color="green" style={{ marginBottom: 8 }}>通过</Tag>
            <Arrow />
            <FlowNode label="库管员派发" sublabel="状态: APPROVED → DISPATCHED" color="#3b82f6" icon={<DatabaseOutlined />} />
            <Arrow />
            <FlowNode label="科室人员签收" sublabel="状态: DISPATCHED → SIGNED" color="#10b981" />
            <Arrow />
            <FlowNode label="库存自动出库" sublabel="生成 inventory_transactions" color="#64748b" />
          </FlowCol>
          <FlowCol>
            <Tag color="red" style={{ marginBottom: 8 }}>驳回</Tag>
            <Arrow />
            <FlowNode label="申领被驳回" sublabel="状态: REJECTED" color="#ef4444" />
          </FlowCol>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <Arrow />
        <FlowNode label="完成" shape="oval" color="#10b981" />
      </div>
    </FlowCol>
  </div>
)

// ─── 采购流程图 ────────────────────────────────────────────────────────────────
const PurchaseFlow: React.FC = () => (
  <div style={{ padding: 24, background: '#f8fafc', borderRadius: 12 }}>
    <Title level={5} style={{ textAlign: 'center', marginBottom: 24 }}>采购管理业务流程</Title>
    <FlowCol>
      <FlowNode label="库存预警触发 / 手动申请" shape="oval" color="#10b981" />
      <Arrow />
      <FlowNode label="创建采购请购单" sublabel="AI 自动补货建议可参考" color="#6366f1" icon={<ShoppingCartOutlined />} />
      <Arrow label="提交" />
      <FlowNode label="科室主任审批请购单" shape="diamond" color="#f59e0b" />
      <div style={{ display: 'flex', gap: 80, marginTop: 8 }}>
        <FlowCol>
          <Tag color="green" style={{ marginBottom: 8 }}>批准</Tag>
          <Arrow />
          <FlowNode label="创建询价单" sublabel="向多家供应商询价" color="#3b82f6" icon={<FileTextOutlined />} />
          <Arrow label="供应商报价" />
          <FlowNode label="对比报价 → 选定供应商" color="#8b5cf6" />
          <Arrow />
          <FlowNode label="签订采购合同" sublabel="状态: ACTIVE" color="#10b981" />
          <Arrow />
          <FlowNode label="收货验收入库" sublabel="生成 inventory 记录" color="#64748b" icon={<DatabaseOutlined />} />
        </FlowCol>
        <FlowCol>
          <Tag color="red" style={{ marginBottom: 8 }}>驳回</Tag>
          <Arrow />
          <FlowNode label="请购单驳回" sublabel="重新修改" color="#ef4444" />
        </FlowCol>
      </div>
      <div style={{ marginTop: 16 }}>
        <Arrow />
        <FlowNode label="完成" shape="oval" color="#10b981" />
      </div>
    </FlowCol>
  </div>
)

// ─── 高值追溯流程图 ────────────────────────────────────────────────────────────
const TraceFlow: React.FC = () => (
  <div style={{ padding: 24, background: '#f8fafc', borderRadius: 12 }}>
    <Title level={5} style={{ textAlign: 'center', marginBottom: 24 }}>高值耗材追溯流程</Title>
    <Row gutter={24}>
      <Col span={8}>
        <FlowCol>
          <Tag color="purple" style={{ marginBottom: 12, fontSize: 13 }}>UDI 管理链路</Tag>
          <FlowNode label="UDI 编码录入" sublabel="扫码/手动" color="#8b5cf6" icon={<QrcodeOutlined />} />
          <Arrow />
          <FlowNode label="与库存批次关联" sublabel="material_udi 表" color="#6366f1" />
          <Arrow />
          <FlowNode label="手术时绑定患者" sublabel="surgery_material_binding" color="#3b82f6" />
          <Arrow />
          <FlowNode label="使用后状态更新" sublabel="IN_STOCK → USED" color="#64748b" />
        </FlowCol>
      </Col>
      <Col span={8}>
        <FlowCol>
          <Tag color="blue" style={{ marginBottom: 12, fontSize: 13 }}>追溯查询路径</Tag>
          <FlowNode label="追溯发起" shape="oval" color="#10b981" />
          <Arrow />
          <FlowNode label="选择追溯维度" shape="diamond" color="#f59e0b" />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <FlowCol>
              <Text style={{ fontSize: 11, color: '#6366f1' }}>按患者</Text>
              <Arrow />
              <FlowNode label="查手术记录" color="#6366f1" />
            </FlowCol>
            <FlowCol>
              <Text style={{ fontSize: 11, color: '#8b5cf6' }}>按耗材</Text>
              <Arrow />
              <FlowNode label="查使用记录" color="#8b5cf6" />
            </FlowCol>
            <FlowCol>
              <Text style={{ fontSize: 11, color: '#3b82f6' }}>按UDI</Text>
              <Arrow />
              <FlowNode label="全生命周期" color="#3b82f6" />
            </FlowCol>
          </div>
        </FlowCol>
      </Col>
      <Col span={8}>
        <FlowCol>
          <Tag color="orange" style={{ marginBottom: 12, fontSize: 13 }}>召回管理链路</Tag>
          <FlowNode label="召回通知发布" sublabel="供应商/监管机构" color="#f59e0b" icon={<AlertOutlined />} />
          <Arrow />
          <FlowNode label="关联受影响批次" sublabel="recall_notice_batches" color="#ef4444" />
          <Arrow />
          <FlowNode label="处置决策" shape="diamond" color="#f59e0b" />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <FlowNode label="退货" color="#3b82f6" />
            <FlowNode label="销毁" color="#ef4444" />
            <FlowNode label="隔离" color="#f59e0b" />
          </div>
        </FlowCol>
      </Col>
    </Row>
  </div>
)

// ─── 库存操作流程图 ───────────────────────────────────────────────────────────
const InventoryFlow: React.FC = () => (
  <div style={{ padding: 24, background: '#f8fafc', borderRadius: 12 }}>
    <Title level={5} style={{ textAlign: 'center', marginBottom: 24 }}>库存管理操作流程</Title>
    <Row gutter={16} justify="center">
      {[
        { label: '入库', desc: '采购收货验收', color: '#10b981', op: 'INBOUND', icon: '+' },
        { label: '出库', desc: '申领派发扣减', color: '#6366f1', op: 'OUTBOUND', icon: '-' },
        { label: '移库', desc: '库位间调配', color: '#3b82f6', op: 'TRANSFER', icon: '⇄' },
        { label: '盘点', desc: '实物核对调整', color: '#8b5cf6', op: 'ADJUSTMENT', icon: '±' },
        { label: '报损', desc: '损坏耗材处理', color: '#ef4444', op: 'DAMAGE', icon: '✕' },
        { label: '借用', desc: '临时借用归还', color: '#f59e0b', op: 'BORROWING', icon: '↕' },
        { label: '退料', desc: '申请退回入库', color: '#06b6d4', op: 'RETURN', icon: '↩' },
      ].map(item => (
        <Col key={item.op} style={{ marginBottom: 16 }}>
          <Card
            size="small"
            style={{ width: 140, textAlign: 'center', borderColor: item.color, borderWidth: 2 }}
            bodyStyle={{ padding: '12px 8px' }}
          >
            <div style={{ fontSize: 28, color: item.color, fontWeight: 700, lineHeight: 1 }}>{item.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: item.color, margin: '6px 0 2px' }}>{item.label}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{item.desc}</div>
            <Tag style={{ marginTop: 6, fontSize: 10 }}>{item.op}</Tag>
          </Card>
        </Col>
      ))}
    </Row>
    <Divider style={{ margin: '16px 0' }} />
    <div style={{ textAlign: 'center' }}>
      <Text type="secondary">所有操作均生成 </Text>
      <Tag color="blue">inventory_transactions</Tag>
      <Text type="secondary"> 流水记录，支持完整操作审计</Text>
    </div>
  </div>
)

// ─── 系统架构图 ───────────────────────────────────────────────────────────────
const ArchitectureFlow: React.FC = () => {
  const { token } = theme.useToken()
  return (
    <div style={{ padding: 24, background: '#f8fafc', borderRadius: 12 }}>
      <Title level={5} style={{ textAlign: 'center', marginBottom: 24 }}>系统技术架构</Title>
      <Row gutter={24}>
        <Col span={8}>
          <Card title="前端层" style={{ borderColor: '#6366f1', borderWidth: 2 }} headStyle={{ background: '#6366f1', color: '#fff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {[
                { label: 'React 18', desc: 'UI 框架' },
                { label: 'TypeScript', desc: '类型安全' },
                { label: 'Vite', desc: '构建工具' },
                { label: 'Ant Design 5', desc: 'UI 组件库' },
                { label: 'Redux Toolkit', desc: '状态管理' },
                { label: 'react-router-dom', desc: '前端路由' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#f1f5f9', borderRadius: 6 }}>
                  <Text strong style={{ fontSize: 12 }}>{item.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="后端层" style={{ borderColor: '#10b981', borderWidth: 2 }} headStyle={{ background: '#10b981', color: '#fff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {[
                { label: 'Spring Boot 3.2', desc: '应用框架' },
                { label: 'Spring Security', desc: '安全控制' },
                { label: 'JWT', desc: '无状态认证' },
                { label: 'JPA / Hibernate', desc: 'ORM 框架' },
                { label: 'Flyway', desc: '数据库版本管理' },
                { label: 'Claude API', desc: 'AI 智能服务' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#f1f5f9', borderRadius: 6 }}>
                  <Text strong style={{ fontSize: 12 }}>{item.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="基础设施层" style={{ borderColor: '#f59e0b', borderWidth: 2 }} headStyle={{ background: '#f59e0b', color: '#fff' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {[
                { label: 'PostgreSQL', desc: '主数据库' },
                { label: 'Redis', desc: '缓存层' },
                { label: 'Docker', desc: '容器化部署' },
                { label: 'Java 17', desc: '运行时' },
                { label: '端口 8080', desc: '后端服务' },
                { label: '端口 3000', desc: '前端服务' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#f1f5f9', borderRadius: 6 }}>
                  <Text strong style={{ fontSize: 12 }}>{item.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
      <Divider />
      <div style={{ textAlign: 'center', padding: 16, background: '#1e293b', borderRadius: 8 }}>
        <Text style={{ color: '#94a3b8', fontSize: 12 }}>
          请求链路：
          <Tag color="blue">React (3000)</Tag>
          → <Tag color="green">Spring Boot (8080)</Tag>
          → <Tag color="orange">PostgreSQL / Redis</Tag>
          → <Tag color="purple">Claude API (AI 功能)</Tag>
        </Text>
      </div>
    </div>
  )
}

// ─── 需求文档表格 ─────────────────────────────────────────────────────────────
const requirementsData = [
  {
    key: '1', module: '认证系统', priority: 'P0', status: 'done',
    requirements: [
      '用户名/密码登录，返回 JWT Token',
      'Token 自动附加到所有 API 请求',
      '登录态持久化（localStorage + Redux）',
      '退出登录清除凭证',
    ]
  },
  {
    key: '2', module: '权限系统', priority: 'P0', status: 'done',
    requirements: [
      '6 种内置角色：ADMIN / DEPT_DIRECTOR / HEAD_NURSE / WAREHOUSE_KEEPER / PURCHASER / FINANCE',
      '19 个权限码：13 菜单权限 + 6 操作权限',
      '前端路由级权限守卫（RequirePermission）',
      '后端方法级权限控制（@PreAuthorize）',
      'ADMIN 角色自动拥有全部权限',
    ]
  },
  {
    key: '3', module: '耗材目录管理', priority: 'P1', status: 'done',
    requirements: [
      '耗材基础信息 CRUD（名称、编码、规格、单位、价格）',
      '供应商关联',
      '最小/最大库存设置，触发预警阈值',
      '注册证号、有效期、厂家（高值耗材扩展）',
      '高值耗材标记（is_high_value）',
    ]
  },
  {
    key: '4', module: '库存管理', priority: 'P1', status: 'done',
    requirements: [
      '库存实时查看（批次、数量、位置、效期）',
      '入库：采购收货验收，支持 inspection_status',
      '出库：申领派发自动扣减',
      '库存盘点：盘点任务创建与结果调整',
      '库存移库：同耗材不同库位调配',
      '库存报损：损坏/过期处理',
      '耗材借用：临时借用与归还管理',
      '退料申请：申请→审批→入库闭环',
      '库存预警：低于最小库存自动告警',
    ]
  },
  {
    key: '5', module: '申领管理', priority: 'P1', status: 'done',
    requirements: [
      '科室人员创建申领单（DRAFT）',
      '多种耗材一单申领',
      '提交申领（SUBMITTED）',
      '科室主任在线审批（APPROVED/REJECTED）',
      '库管员核查并派发（DISPATCHED）',
      '科室人员确认签收（SIGNED）',
      '审批记录全程追踪',
      'AI 审批辅助：用量合理性分析',
      'AI 申领推荐：基于历史消耗自动建议',
    ]
  },
  {
    key: '6', module: '采购管理', priority: 'P1', status: 'done',
    requirements: [
      '三级采购流程：请购单 → 询价单 → 合同',
      '请购单：触发原因、预计金额、审批',
      '询价单：向供应商询价，记录报价',
      '合同管理：合同号、有效期、条款',
      'AI 自动补货建议（基于库存预警）',
    ]
  },
  {
    key: '7', module: '高值追溯', priority: 'P1', status: 'done',
    requirements: [
      'UDI（统一器械标识）编码录入与管理',
      '扫码快速查询 UDI 详情',
      'UDI 状态管理：IN_STOCK / USED / RETURNED / DISCARDED',
      '手术记录创建与耗材绑定',
      '按患者追溯：查看患者使用的所有高值耗材',
      '按耗材追溯：查看耗材从入库到使用的全链路',
      '按 UDI 追溯：完整生命周期记录',
    ]
  },
  {
    key: '8', module: '召回管理', priority: 'P2', status: 'done',
    requirements: [
      '召回通知录入（来源：供应商/监管机构）',
      '召回级别：I / II / III 级',
      '关联受影响耗材批次',
      '处置类型：退货 / 销毁 / 隔离',
      '召回处置记录与状态追踪',
    ]
  },
  {
    key: '9', module: 'AI 智能', priority: 'P2', status: 'done',
    requirements: [
      '需求预测：基于历史消耗的 MA / 时间序列算法',
      '安全库存计算：根据预测值自动推荐',
      '预警中心：低库存、近效期、消耗异常聚合展示',
      '消耗异常检测：均值 ±3σ 统计异常',
      '近效期处置建议：30 天内即将过期的库存',
      '申领推荐：基于科室历史给出申领量建议',
      '申领审核辅助：用量合理性分析',
      'BI 大屏洞察：全局库存健康评分与趋势',
      'AI 对话助手：规则 + Claude 混合问答',
    ]
  },
  {
    key: '10', module: '统计报表', priority: 'P2', status: 'done',
    requirements: [
      '工作台：关键指标卡片（库存量、待审批、预警数等）',
      '消耗趋势：折线图展示各耗材消耗走势',
      '科室排名：各科室耗材消耗量排行',
      '成本分析：按品类/科室拆解成本结构',
      'BI 大屏：全屏可视化，支持深色主题',
    ]
  },
  {
    key: '11', module: '系统管理', priority: 'P1', status: 'done',
    requirements: [
      '用户管理：CRUD、状态启停、角色分配',
      '角色管理：CRUD、权限勾选分配',
      '科室管理：树形结构维护',
      '供应商管理：CRUD、联系信息维护',
      '字典管理：数据字典类型与条目维护',
    ]
  },
]

const RequirementsTable: React.FC = () => {
  const columns = [
    {
      title: '功能模块',
      dataIndex: 'module',
      width: 130,
      render: (val: string) => <Text strong>{val}</Text>
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 80,
      render: (val: string) => {
        const color = val === 'P0' ? 'red' : val === 'P1' ? 'orange' : 'blue'
        return <Tag color={color}>{val}</Tag>
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (val: string) => (
        <Badge status="success" text={<Text style={{ color: '#10b981', fontSize: 12 }}>已完成</Text>} />
      )
    },
    {
      title: '功能需求列表',
      dataIndex: 'requirements',
      render: (items: string[]) => (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: 13, lineHeight: '22px', color: '#334155' }}>{item}</li>
          ))}
        </ul>
      )
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={requirementsData}
      pagination={false}
      size="small"
      bordered
      rowKey="key"
    />
  )
}

// ─── 权限矩阵表 ───────────────────────────────────────────────────────────────
const PermissionMatrix: React.FC = () => {
  const roles = ['ADMIN', 'DEPT_DIRECTOR', 'HEAD_NURSE', 'WAREHOUSE_KEEPER', 'PURCHASER', 'FINANCE']
  const menus = [
    { key: 'menu:dashboard', label: '工作台' },
    { key: 'menu:material', label: '耗材目录' },
    { key: 'menu:inventory', label: '库存管理' },
    { key: 'menu:requisition', label: '申领管理' },
    { key: 'menu:purchase', label: '采购管理' },
    { key: 'menu:tracing', label: '高值追溯' },
    { key: 'menu:ai', label: 'AI 智能' },
    { key: 'menu:report', label: '统计报表' },
    { key: 'menu:system:user', label: '用户管理' },
    { key: 'menu:system:role', label: '角色管理' },
    { key: 'material:edit', label: '耗材编辑' },
    { key: 'inventory:edit', label: '库存操作' },
    { key: 'requisition:approve', label: '审批申领' },
    { key: 'purchase:edit', label: '采购编辑' },
    { key: 'user:edit', label: '用户编辑' },
    { key: 'role:edit', label: '角色编辑' },
  ]
  const matrix: Record<string, Record<string, boolean>> = {
    'ADMIN': Object.fromEntries(menus.map(m => [m.key, true])),
    'DEPT_DIRECTOR': {
      'menu:dashboard': true, 'menu:material': true, 'menu:inventory': true,
      'menu:requisition': true, 'menu:report': true, 'requisition:approve': true,
    },
    'HEAD_NURSE': {
      'menu:dashboard': true, 'menu:material': true, 'menu:inventory': true,
      'menu:requisition': true, 'menu:tracing': true, 'inventory:edit': true,
    },
    'WAREHOUSE_KEEPER': {
      'menu:dashboard': true, 'menu:material': true, 'menu:inventory': true,
      'menu:tracing': true, 'inventory:edit': true,
    },
    'PURCHASER': {
      'menu:dashboard': true, 'menu:material': true, 'menu:inventory': true,
      'menu:purchase': true, 'purchase:edit': true,
    },
    'FINANCE': {
      'menu:dashboard': true, 'menu:material': true, 'menu:inventory': true,
      'menu:report': true,
    },
  }

  const columns = [
    { title: '权限 / 角色', dataIndex: 'label', width: 120, fixed: 'left' as const },
    ...roles.map(r => ({
      title: r,
      dataIndex: r,
      width: 120,
      render: (_: any, row: any) => matrix[r]?.[row.key]
        ? <CheckCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
        : <StopOutlined style={{ color: '#e2e8f0', fontSize: 16 }} />
    }))
  ]

  return (
    <Table
      columns={columns}
      dataSource={menus}
      rowKey="key"
      pagination={false}
      size="small"
      bordered
      scroll={{ x: 800 }}
      rowClassName={(_, i) => i < 10 ? '' : 'ant-table-row-level-0'}
    />
  )
}

// ─── 数据库表清单 ─────────────────────────────────────────────────────────────
const dbTables = [
  { version: 'V1', table: 'departments', desc: '科室表，支持树形父子结构', category: '基础数据' },
  { version: 'V1', table: 'suppliers', desc: '供应商基本信息', category: '基础数据' },
  { version: 'V1', table: 'materials', desc: '耗材字典表，含库存预警阈值', category: '耗材管理' },
  { version: 'V1', table: 'inventory', desc: '库存批次记录，含效期、位置信息', category: '库存管理' },
  { version: 'V1', table: 'roles', desc: '系统角色表', category: '权限管理' },
  { version: 'V1', table: 'users', desc: '用户表，BCrypt 加密密码', category: '权限管理' },
  { version: 'V1', table: 'user_roles', desc: '用户-角色多对多关联', category: '权限管理' },
  { version: 'V1', table: 'requisitions', desc: '申领单主表，含完整状态机', category: '申领管理' },
  { version: 'V1', table: 'requisition_items', desc: '申领单明细：耗材+数量', category: '申领管理' },
  { version: 'V1', table: 'approval_records', desc: '审批操作历史记录', category: '申领管理' },
  { version: 'V1', table: 'inventory_transactions', desc: '库存流水：入/出/调整', category: '库存管理' },
  { version: 'V4', table: 'sys_dict / sys_dict_item', desc: '数据字典类型与条目', category: '系统管理' },
  { version: 'V4', table: 'inventory_stocktaking', desc: '库存盘点主从表', category: '库存管理' },
  { version: 'V4', table: 'inventory_transfer', desc: '库位转移记录', category: '库存管理' },
  { version: 'V4', table: 'inventory_damage', desc: '报损记录', category: '库存管理' },
  { version: 'V4', table: 'inventory_borrowing', desc: '借用与归还记录', category: '库存管理' },
  { version: 'V4', table: 'material_udi', desc: 'UDI 编码与库存关联', category: '高值追溯' },
  { version: 'V4', table: 'surgery_record', desc: '手术记录表', category: '高值追溯' },
  { version: 'V4', table: 'surgery_material_binding', desc: '手术与高值耗材绑定', category: '高值追溯' },
  { version: 'V4', table: 'ai_prediction_result', desc: 'AI 需求预测结果', category: 'AI 智能' },
  { version: 'V4', table: 'purchase_requisition', desc: '采购请购单', category: '采购管理' },
  { version: 'V4', table: 'purchase_inquiry', desc: '采购询价单', category: '采购管理' },
  { version: 'V4', table: 'purchase_contract', desc: '采购合同', category: '采购管理' },
  { version: 'V6', table: 'permissions', desc: '权限表（menu/action 两类）', category: '权限管理' },
  { version: 'V6', table: 'role_permissions', desc: '角色-权限关联表', category: '权限管理' },
  { version: 'V7', table: 'recall_notices', desc: '召回通知（含批次、处置）', category: '召回管理' },
  { version: 'V8', table: 'return_requests', desc: '退料申请主从表', category: '库存管理' },
]

const DbTableList: React.FC = () => {
  const categoryColors: Record<string, string> = {
    '基础数据': 'cyan', '耗材管理': 'green', '库存管理': 'blue',
    '申领管理': 'purple', '采购管理': 'orange', '高值追溯': 'geekblue',
    'AI 智能': 'magenta', '权限管理': 'red', '召回管理': 'volcano', '系统管理': 'gold',
  }
  const columns = [
    { title: '迁移版本', dataIndex: 'version', width: 90, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '表名', dataIndex: 'table', width: 220, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: '说明', dataIndex: 'desc' },
    {
      title: '所属模块', dataIndex: 'category', width: 100,
      render: (v: string) => <Tag color={categoryColors[v]}>{v}</Tag>
    },
  ]
  return (
    <Table
      columns={columns}
      dataSource={dbTables}
      rowKey="table"
      pagination={false}
      size="small"
      bordered
      scroll={{ y: 500 }}
    />
  )
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function DocsPage() {
  const { token } = theme.useToken()
  const [activeTab, setActiveTab] = useState('overview')

  const tabItems = [
    {
      key: 'overview',
      label: '项目概述',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={24}>
          <Card>
            <Descriptions
              title="系统基本信息"
              bordered
              column={2}
              labelStyle={{ fontWeight: 600, width: 130 }}
            >
              <Descriptions.Item label="系统名称">智能医疗耗材管理系统</Descriptions.Item>
              <Descriptions.Item label="版本">V1.0（数据库迁移至 V9）</Descriptions.Item>
              <Descriptions.Item label="后端框架">Spring Boot 3.2 + PostgreSQL</Descriptions.Item>
              <Descriptions.Item label="前端框架">React 18 + TypeScript + Ant Design 5</Descriptions.Item>
              <Descriptions.Item label="AI 引擎">Claude API（claude-haiku-4-5-20251001）</Descriptions.Item>
              <Descriptions.Item label="认证方式">JWT 无状态 Token 认证</Descriptions.Item>
              <Descriptions.Item label="控制器数量">19 个</Descriptions.Item>
              <Descriptions.Item label="服务类数量">26 个（含 9 个 AI 服务）</Descriptions.Item>
              <Descriptions.Item label="前端页面数量">31+ 个</Descriptions.Item>
              <Descriptions.Item label="数据库表数量">38+ 张（V1～V9 迁移）</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="功能模块总览">
            <Row gutter={[16, 16]}>
              {[
                { icon: <MedicineBoxOutlined />, title: '耗材目录', desc: '耗材信息维护、分类、库存阈值', color: '#10b981' },
                { icon: <DatabaseOutlined />, title: '库存管理', desc: '入库/出库/盘点/移库/报损/借用/退料', color: '#6366f1' },
                { icon: <FileTextOutlined />, title: '申领管理', desc: '申领全生命周期：创建→审批→派发→签收', color: '#8b5cf6' },
                { icon: <ShoppingCartOutlined />, title: '采购管理', desc: '请购→询价→合同三级采购流程', color: '#f59e0b' },
                { icon: <QrcodeOutlined />, title: '高值追溯', desc: 'UDI 管理、手术绑定、全链路追溯', color: '#3b82f6' },
                { icon: <AlertOutlined />, title: '召回管理', desc: '产品召回通知、受控批次、处置记录', color: '#ef4444' },
                { icon: <RobotOutlined />, title: 'AI 智能', desc: '需求预测/预警/推荐/审核/对话助手', color: '#ec4899' },
                { icon: <BarChartOutlined />, title: '统计报表', desc: '趋势图、科室排名、成本分析、BI 大屏', color: '#06b6d4' },
                { icon: <SafetyCertificateOutlined />, title: '权限系统', desc: '6 角色 + 19 权限码，前后端双重校验', color: '#84cc16' },
                { icon: <SettingOutlined />, title: '系统管理', desc: '用户/角色/科室/供应商/字典 CRUD', color: '#64748b' },
              ].map(item => (
                <Col span={12} key={item.title}>
                  <Card size="small" style={{ borderLeft: `4px solid ${item.color}` }}>
                    <Space>
                      <span style={{ color: item.color, fontSize: 20 }}>{item.icon}</span>
                      <div>
                        <Text strong>{item.title}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          <ArchitectureFlow />
        </Space>
      )
    },
    {
      key: 'flowcharts',
      label: '业务流程图',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={24}>
          <RequisitionFlow />
          <PurchaseFlow />
          <TraceFlow />
          <InventoryFlow />
        </Space>
      )
    },
    {
      key: 'requirements',
      label: '功能需求文档',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={24}>
          <Card title="功能需求清单" extra={
            <Space>
              <Tag color="red">P0 - 核心必须</Tag>
              <Tag color="orange">P1 - 重要功能</Tag>
              <Tag color="blue">P2 - 增强功能</Tag>
            </Space>
          }>
            <RequirementsTable />
          </Card>
        </Space>
      )
    },
    {
      key: 'permissions',
      label: '权限矩阵',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size={24}>
          <Card title="角色-权限矩阵">
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
              系统共设 6 种角色，19 个权限码（13 菜单权限 + 6 操作权限）。ADMIN 角色自动拥有所有权限。
            </Paragraph>
            <PermissionMatrix />
          </Card>
          <Card title="角色说明">
            <Table
              bordered
              size="small"
              pagination={false}
              dataSource={[
                { role: 'ADMIN', name: '系统管理员', desc: '拥有全部功能与数据权限' },
                { role: 'DEPT_DIRECTOR', name: '科室主任', desc: '审批申领单，查看科室报表' },
                { role: 'HEAD_NURSE', name: '护士长', desc: '管理科室库存，发起申领' },
                { role: 'WAREHOUSE_KEEPER', name: '库管员', desc: '库存入库/出库/盘点/派发' },
                { role: 'PURCHASER', name: '采购员', desc: '管理采购请购/询价/合同' },
                { role: 'FINANCE', name: '财务人员', desc: '查看报表与成本分析（只读）' },
              ]}
              columns={[
                { title: '角色代码', dataIndex: 'role', width: 160, render: (v: string) => <Tag color="blue">{v}</Tag> },
                { title: '角色名称', dataIndex: 'name', width: 120 },
                { title: '职责说明', dataIndex: 'desc' },
              ]}
              rowKey="role"
            />
          </Card>
        </Space>
      )
    },
    {
      key: 'database',
      label: '数据库表清单',
      children: (
        <Card title="数据库表总览（38+ 张表，V1～V9 Flyway 迁移）">
          <DbTableList />
        </Card>
      )
    },
  ]

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>项目文档</Title>
        <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
          智能医疗耗材管理系统 — 功能流程图与项目需求文档
        </Paragraph>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="large"
        items={tabItems}
        style={{ background: token.colorBgContainer }}
      />
    </div>
  )
}
