import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Space, Badge, theme, Breadcrumb } from 'antd'
import {
  DashboardOutlined, MedicineBoxOutlined, DatabaseOutlined,
  FileTextOutlined, SettingOutlined, UserOutlined, TeamOutlined,
  ApartmentOutlined, ShopOutlined, LogoutOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, BellOutlined, QrcodeOutlined, RobotOutlined,
  ShoppingCartOutlined, BarChartOutlined, WarningOutlined,
  BookOutlined, SwapOutlined, MinusCircleOutlined, RetweetOutlined,
  SearchOutlined, ExperimentOutlined, DollarOutlined, FundOutlined,
  DesktopOutlined, HomeOutlined,
} from '@ant-design/icons'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '@/store/slices/authSlice'
import type { RootState } from '@/store'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  {
    key: '/basic',
    icon: <BookOutlined />,
    label: '基础数据',
    children: [
      { key: '/materials', icon: <MedicineBoxOutlined />, label: '耗材目录' },
      { key: '/dict', icon: <BookOutlined />, label: '字典管理' },
      { key: '/system/suppliers', icon: <ShopOutlined />, label: '供应商' },
      { key: '/system/departments', icon: <ApartmentOutlined />, label: '科室管理' },
    ],
  },
  {
    key: '/inv',
    icon: <DatabaseOutlined />,
    label: '库存管理',
    children: [
      { key: '/inventory', icon: <DatabaseOutlined />, label: '库存列表' },
      { key: '/inventory/stocktaking', icon: <SearchOutlined />, label: '库存盘点' },
      { key: '/inventory/transfer', icon: <SwapOutlined />, label: '库存移库' },
      { key: '/inventory/damage', icon: <MinusCircleOutlined />, label: '库存报损' },
      { key: '/inventory/borrowing', icon: <RetweetOutlined />, label: '耗材借用' },
    ],
  },
  { key: '/requisitions', icon: <FileTextOutlined />, label: '申领管理' },
  {
    key: '/tracing',
    icon: <QrcodeOutlined />,
    label: '高值追溯',
    children: [
      { key: '/tracing/udi', icon: <QrcodeOutlined />, label: 'UDI管理' },
      { key: '/tracing/surgery', icon: <ExperimentOutlined />, label: '手术记录' },
      { key: '/tracing/patient', icon: <SearchOutlined />, label: '全链追溯' },
    ],
  },
  {
    key: '/ai',
    icon: <RobotOutlined />,
    label: 'AI 智能',
    children: [
      { key: '/ai/prediction', icon: <RobotOutlined />, label: '需求预测' },
      { key: '/ai/warnings', icon: <WarningOutlined />, label: '预警中心' },
    ],
  },
  {
    key: '/purchase',
    icon: <ShoppingCartOutlined />,
    label: '采购管理',
    children: [
      { key: '/purchase/requisition', icon: <FileTextOutlined />, label: '请购单' },
      { key: '/purchase/inquiry', icon: <DollarOutlined />, label: '询价单' },
      { key: '/purchase/contract', icon: <ShoppingCartOutlined />, label: '采购合同' },
    ],
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: '统计报表',
    children: [
      { key: '/reports/bi-screen', icon: <DesktopOutlined />, label: 'BI 大屏' },
      { key: '/reports/trend', icon: <BarChartOutlined />, label: '消耗趋势' },
      { key: '/reports/dept-ranking', icon: <FundOutlined />, label: '科室排名' },
      { key: '/reports/cost-analysis', icon: <DollarOutlined />, label: '成本分析' },
    ],
  },
  {
    key: '/system',
    icon: <SettingOutlined />,
    label: '系统管理',
    children: [
      { key: '/system/users', icon: <UserOutlined />, label: '用户管理' },
      { key: '/system/roles', icon: <TeamOutlined />, label: '角色管理' },
    ],
  },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { realName, roles } = useSelector((state: RootState) => state.auth)
  const { token } = theme.useToken()

  const handleMenuClick = ({ key }: { key: string }) => navigate(key)

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'logout') {
      dispatch(logout())
      navigate('/login')
    }
  }

  // 计算当前路径
  const path = location.pathname

  // 面包屑路由映射
  const breadcrumbMap: Record<string, { parent?: string; label: string }> = {
    '/dashboard': { label: '工作台' },
    '/materials': { parent: '基础数据', label: '耗材目录' },
    '/dict': { parent: '基础数据', label: '字典管理' },
    '/system/suppliers': { parent: '基础数据', label: '供应商' },
    '/system/departments': { parent: '基础数据', label: '科室管理' },
    '/inventory': { parent: '库存管理', label: '库存列表' },
    '/inventory/stocktaking': { parent: '库存管理', label: '库存盘点' },
    '/inventory/transfer': { parent: '库存管理', label: '库存移库' },
    '/inventory/damage': { parent: '库存管理', label: '库存报损' },
    '/inventory/borrowing': { parent: '库存管理', label: '耗材借用' },
    '/requisitions': { label: '申领管理' },
    '/tracing/udi': { parent: '高值追溯', label: 'UDI管理' },
    '/tracing/surgery': { parent: '高值追溯', label: '手术记录' },
    '/tracing/patient': { parent: '高值追溯', label: '全链追溯' },
    '/ai/prediction': { parent: 'AI 智能', label: '需求预测' },
    '/ai/warnings': { parent: 'AI 智能', label: '预警中心' },
    '/purchase/requisition': { parent: '采购管理', label: '请购单' },
    '/purchase/inquiry': { parent: '采购管理', label: '询价单' },
    '/purchase/contract': { parent: '采购管理', label: '采购合同' },
    '/reports/bi-screen': { parent: '统计报表', label: 'BI 大屏' },
    '/reports/trend': { parent: '统计报表', label: '消耗趋势' },
    '/reports/dept-ranking': { parent: '统计报表', label: '科室排名' },
    '/reports/cost-analysis': { parent: '统计报表', label: '成本分析' },
    '/system/users': { parent: '系统管理', label: '用户管理' },
    '/system/roles': { parent: '系统管理', label: '角色管理' },
  }

  const getBreadcrumbItems = () => {
    const info = breadcrumbMap[path]
    const items: { title: React.ReactNode }[] = [{ title: <HomeOutlined /> }]
    if (info?.parent) items.push({ title: <span>{info.parent}</span> })
    if (info) items.push({ title: <span>{info.label}</span> })
    return items
  }

  // 计算当前选中的菜单项
  const selectedKey = path

  const getOpenKeys = () => {
    if (path.startsWith('/inventory')) return ['/inv']
    if (path.startsWith('/materials') || path.startsWith('/dict') || path.startsWith('/system/suppliers') || path.startsWith('/system/departments')) return ['/basic']
    if (path.startsWith('/tracing')) return ['/tracing']
    if (path.startsWith('/ai')) return ['/ai']
    if (path.startsWith('/purchase')) return ['/purchase']
    if (path.startsWith('/reports')) return ['/reports']
    if (path.startsWith('/system')) return ['/system']
    return []
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
        style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, overflowY: 'auto', overflowX: 'hidden' }}
      >
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: collapsed ? 14 : 15, fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 12px',
          overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {collapsed ? '医耗' : '智能医疗耗材系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Header style={{
          position: 'sticky', top: 0, zIndex: 99,
          background: token.colorBgContainer,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          height: 56,
        }}>
          <Space size={16}>
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 18, cursor: 'pointer', color: token.colorText, lineHeight: 1, display: 'flex' }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: token.colorText }}>
              欢迎，{realName || '用户'}
            </span>
          </Space>
          <Space size={16}>
            <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              角色：<span style={{ color: token.colorPrimary }}>{roles?.[0] || 'USER'}</span>
            </span>
            <Badge count={3} size="small" offset={[2, 0]}>
              <BellOutlined style={{ fontSize: 16, cursor: 'pointer', color: token.colorTextSecondary }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }}>
              <Space style={{ cursor: 'pointer' }} size={6}>
                <Avatar style={{ backgroundColor: token.colorPrimary }} icon={<UserOutlined />} size={28} />
                <span style={{ fontSize: 13, color: token.colorText }}>{realName || '用户'}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <div style={{
          padding: '10px 24px',
          background: token.colorBgLayout,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <Breadcrumb items={getBreadcrumbItems()} />
        </div>
        <Content style={{ margin: 24, minHeight: 'calc(100vh - 136px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
