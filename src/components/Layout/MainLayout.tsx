import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Badge,
  theme,
  Breadcrumb,
  Popover,
  List,
  Tag,
  Empty,
  Spin,
} from "antd";
import {
  DashboardOutlined,
  MedicineBoxOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  ApartmentOutlined,
  ShopOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  QrcodeOutlined,
  RobotOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  WarningOutlined,
  BookOutlined,
  SwapOutlined,
  MinusCircleOutlined,
  RetweetOutlined,
  SearchOutlined,
  ExperimentOutlined,
  DollarOutlined,
  FundOutlined,
  DesktopOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import type { RootState } from "@/store";
import { usePermission } from "@/hooks/usePermission";
import styled from "styled-components";
import { notificationsApi, type NotificationVO } from "@/api/notifications";

const { Header, Sider, Content } = Layout;

// 内容区：纵向 flex 容器，随侧边栏宽度收缩/展开
const StyledContentLayout = styled(Layout)<{ $collapsed: boolean }>`
  margin-left: ${(p) => (p.$collapsed ? "80px" : "220px")};
  transition: margin-left 0.2s;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

// 顶部栏：固定高度，不参与滚动
const StyledHeader = styled(Header)<{ $bg: string }>`
  background: ${(p) => p.$bg};
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  flex-shrink: 0;
  padding: 0 24px;
  height: 56px;
  line-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

// Logo 区域
const StyledLogo = styled.div<{ $collapsed: boolean }>`
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${(p) => (p.$collapsed ? "14px" : "15px")};
  font-weight: 700;
  color: #fff;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  white-space: nowrap;
  flex-shrink: 0;
`;

// 面包屑：固定高度，不参与滚动
const StyledBreadcrumbWrapper = styled.div<{
  $bg: string;
  $borderColor: string;
}>`
  background: ${(p) => p.$bg};
  border-bottom: 1px solid ${(p) => p.$borderColor};
  flex-shrink: 0;
  padding: 16px 24px;
`;

// 内容主体：占满剩余高度，独立滚动
const StyledContent = styled(Content)`
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 24px;
  min-height: 0;
`;

// 全量菜单定义，每项携带所需权限码（无 permission 字段则表示所有人可见）
const ALL_MENU_ITEMS = [
  { key: "/dashboard", icon: <DashboardOutlined />, label: "工作台" },
  {
    key: "/basic",
    icon: <BookOutlined />,
    label: "基础数据",
    children: [
      {
        key: "/materials",
        icon: <MedicineBoxOutlined />,
        label: "耗材目录",
        permission: "menu:material",
      },
      {
        key: "/dict",
        icon: <BookOutlined />,
        label: "字典管理",
        permission: "menu:dict",
      },
      {
        key: "/system/suppliers",
        icon: <ShopOutlined />,
        label: "供应商",
        permission: "menu:supplier",
      },
      {
        key: "/system/departments",
        icon: <ApartmentOutlined />,
        label: "科室管理",
        permission: "menu:department",
      },
    ],
  },
  {
    key: "/inv",
    icon: <DatabaseOutlined />,
    label: "库存管理",
    permission: "menu:inventory",
    children: [
      { key: "/inventory", icon: <DatabaseOutlined />, label: "库存列表" },
      {
        key: "/inventory/stocktaking",
        icon: <SearchOutlined />,
        label: "库存盘点",
      },
      { key: "/inventory/transfer", icon: <SwapOutlined />, label: "库存移库" },
      {
        key: "/inventory/damage",
        icon: <MinusCircleOutlined />,
        label: "库存报损",
      },
      {
        key: "/inventory/borrowing",
        icon: <RetweetOutlined />,
        label: "耗材借用",
      },
    ],
  },
  {
    key: "/requisitions",
    icon: <FileTextOutlined />,
    label: "申领管理",
    permission: "menu:requisition",
  },
  {
    key: "/tracing",
    icon: <QrcodeOutlined />,
    label: "高值追溯",
    permission: "menu:tracing",
    children: [
      { key: "/tracing/udi", icon: <QrcodeOutlined />, label: "UDI管理" },
      {
        key: "/tracing/surgery",
        icon: <ExperimentOutlined />,
        label: "手术记录",
      },
      { key: "/tracing/patient", icon: <SearchOutlined />, label: "全链追溯" },
    ],
  },
  {
    key: "/ai",
    icon: <RobotOutlined />,
    label: "AI 智能",
    permission: "menu:ai",
    children: [
      { key: "/ai/prediction", icon: <RobotOutlined />, label: "需求预测" },
      { key: "/ai/warnings", icon: <WarningOutlined />, label: "预警中心" },
    ],
  },
  {
    key: "/purchase",
    icon: <ShoppingCartOutlined />,
    label: "采购管理",
    permission: "menu:purchase",
    children: [
      {
        key: "/purchase/requisition",
        icon: <FileTextOutlined />,
        label: "请购单",
      },
      { key: "/purchase/inquiry", icon: <DollarOutlined />, label: "询价单" },
      {
        key: "/purchase/contract",
        icon: <ShoppingCartOutlined />,
        label: "采购合同",
      },
    ],
  },
  {
    key: "/reports",
    icon: <BarChartOutlined />,
    label: "统计报表",
    permission: "menu:report",
    children: [
      {
        key: "/reports/bi-screen",
        icon: <DesktopOutlined />,
        label: "BI 大屏",
      },
      { key: "/reports/trend", icon: <BarChartOutlined />, label: "消耗趋势" },
      {
        key: "/reports/dept-ranking",
        icon: <FundOutlined />,
        label: "科室排名",
      },
      {
        key: "/reports/cost-analysis",
        icon: <DollarOutlined />,
        label: "成本分析",
      },
    ],
  },
  {
    key: "/system",
    icon: <SettingOutlined />,
    label: "系统管理",
    children: [
      {
        key: "/system/users",
        icon: <UserOutlined />,
        label: "用户管理",
        permission: "menu:system:user",
      },
      {
        key: "/system/roles",
        icon: <TeamOutlined />,
        label: "角色管理",
        permission: "menu:system:role",
      },
    ],
  },
];

const LEVEL_COLOR: Record<string, string> = { info: 'blue', warning: 'orange', error: 'red' }
const LEVEL_LABEL: Record<string, string> = { info: '提示', warning: '待处理', error: '紧急' }

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<NotificationVO[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { realName, roles } = useSelector((state: RootState) => state.auth);
  const { token } = theme.useToken();
  const { can, isAdmin } = usePermission();

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await notificationsApi.getAll();
      setNotifications(res.items || []);
    } catch {}
    finally { setNotifLoading(false); }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60_000); // 每分钟刷新
    return () => clearInterval(timer);
  }, []);

  // 根据权限过滤菜单
  type RawMenuItem = {
    key: string;
    icon?: React.ReactNode;
    label: string;
    permission?: string;
    children?: RawMenuItem[];
  };
  const filterMenuItems = (items: RawMenuItem[]): typeof items => {
    return items.reduce<RawMenuItem[]>((acc, item) => {
      if (item.permission && !isAdmin() && !can(item.permission)) return acc;
      if (item.children) {
        const filteredChildren = filterMenuItems(item.children);
        if (filteredChildren.length === 0) return acc;
        acc.push({ ...item, children: filteredChildren });
      } else {
        acc.push(item);
      }
      return acc;
    }, []);
  };
  const menuItems = filterMenuItems(ALL_MENU_ITEMS as RawMenuItem[]);

  const handleMenuClick = ({ key }: { key: string }) => navigate(key);

  const userMenuItems = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      danger: true,
    },
  ];

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === "logout") {
      dispatch(logout());
      navigate("/login");
    }
  };

  const path = location.pathname;

  const breadcrumbMap: Record<string, { parent?: string; label: string }> = {
    "/dashboard": { label: "工作台" },
    "/materials": { parent: "基础数据", label: "耗材目录" },
    "/dict": { parent: "基础数据", label: "字典管理" },
    "/system/suppliers": { parent: "基础数据", label: "供应商" },
    "/system/departments": { parent: "基础数据", label: "科室管理" },
    "/inventory": { parent: "库存管理", label: "库存列表" },
    "/inventory/stocktaking": { parent: "库存管理", label: "库存盘点" },
    "/inventory/transfer": { parent: "库存管理", label: "库存移库" },
    "/inventory/damage": { parent: "库存管理", label: "库存报损" },
    "/inventory/borrowing": { parent: "库存管理", label: "耗材借用" },
    "/requisitions": { label: "申领管理" },
    "/tracing/udi": { parent: "高值追溯", label: "UDI管理" },
    "/tracing/surgery": { parent: "高值追溯", label: "手术记录" },
    "/tracing/patient": { parent: "高值追溯", label: "全链追溯" },
    "/ai/prediction": { parent: "AI 智能", label: "需求预测" },
    "/ai/warnings": { parent: "AI 智能", label: "预警中心" },
    "/purchase/requisition": { parent: "采购管理", label: "请购单" },
    "/purchase/inquiry": { parent: "采购管理", label: "询价单" },
    "/purchase/contract": { parent: "采购管理", label: "采购合同" },
    "/reports/bi-screen": { parent: "统计报表", label: "BI 大屏" },
    "/reports/trend": { parent: "统计报表", label: "消耗趋势" },
    "/reports/dept-ranking": { parent: "统计报表", label: "科室排名" },
    "/reports/cost-analysis": { parent: "统计报表", label: "成本分析" },
    "/system/users": { parent: "系统管理", label: "用户管理" },
    "/system/roles": { parent: "系统管理", label: "角色管理" },
  };

  const getBreadcrumbItems = () => {
    const info = breadcrumbMap[path];
    const items: { title: React.ReactNode }[] = [{ title: <HomeOutlined /> }];
    if (info?.parent) items.push({ title: <span>{info.parent}</span> });
    if (info) items.push({ title: <span>{info.label}</span> });
    return items;
  };

  const getOpenKeys = () => {
    if (path.startsWith("/inventory")) return ["/inv"];
    if (
      path.startsWith("/materials") ||
      path.startsWith("/dict") ||
      path.startsWith("/system/suppliers") ||
      path.startsWith("/system/departments")
    )
      return ["/basic"];
    if (path.startsWith("/tracing")) return ["/tracing"];
    if (path.startsWith("/ai")) return ["/ai"];
    if (path.startsWith("/purchase")) return ["/purchase"];
    if (path.startsWith("/reports")) return ["/reports"];
    if (path.startsWith("/system")) return ["/system"];
    return [];
  };

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      {/* 侧边栏：固定定位，独立滚动 */}
      <Sider
        collapsed={collapsed}
        trigger={null}
        theme="dark"
        width={220}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <StyledLogo $collapsed={collapsed}>
          {collapsed ? "医耗" : "智能医疗耗材系统"}
        </StyledLogo>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[path]}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, flex: 1 }}
        />
      </Sider>

      {/* 内容区：随侧边栏宽度偏移，纵向 flex，内容独立滚动 */}
      <StyledContentLayout $collapsed={collapsed}>
        {/* 顶部导航栏 */}
        <StyledHeader $bg={token.colorBgContainer}>
          <Space size={16}>
            <span
              style={{
                color: token.colorText,
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
              }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <span
              style={{ color: token.colorText, fontSize: 15, fontWeight: 600 }}
            >
              欢迎，{realName || "用户"}
            </span>
          </Space>
          <Space size={16}>
            <span style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              角色：
              <span style={{ color: token.colorPrimary }}>
                {roles?.join(" / ") || "USER"}
              </span>
            </span>
            <Popover
              open={notifOpen}
              onOpenChange={v => { setNotifOpen(v); if (v) fetchNotifications(); }}
              trigger="click"
              placement="bottomRight"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: 340 }}>
                  <span style={{ fontWeight: 600 }}>消息通知</span>
                  <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
                    共 {notifications.length} 条
                  </span>
                </div>
              }
              content={
                <div style={{ width: 340, maxHeight: 400, overflowY: 'auto' }}>
                  <Spin spinning={notifLoading}>
                    {notifications.length === 0
                      ? <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '24px 0' }} />
                      : (
                        <List
                          size="small"
                          dataSource={notifications}
                          renderItem={item => (
                            <List.Item
                              style={{ cursor: item.linkPath ? 'pointer' : 'default', padding: '8px 0' }}
                              onClick={() => {
                                if (item.linkPath) { navigate(item.linkPath); setNotifOpen(false); }
                              }}
                            >
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                  <span style={{ fontWeight: 500, fontSize: 13 }}>{item.title}</span>
                                  <Tag color={LEVEL_COLOR[item.level]} style={{ fontSize: 11, margin: 0 }}>
                                    {LEVEL_LABEL[item.level]}
                                  </Tag>
                                </div>
                                <div style={{ color: token.colorTextSecondary, fontSize: 12 }}>{item.content}</div>
                              </div>
                            </List.Item>
                          )}
                        />
                      )
                    }
                  </Spin>
                </div>
              }
            >
              <Badge count={notifications.length} size="small" offset={[2, 0]} overflowCount={99}>
                <BellOutlined
                  style={{ color: token.colorTextSecondary, fontSize: 16, cursor: 'pointer' }}
                />
              </Badge>
            </Popover>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }}>
              <Space size={6} style={{ cursor: "pointer" }}>
                <Avatar
                  style={{ backgroundColor: token.colorPrimary }}
                  icon={<UserOutlined />}
                  size={28}
                />
                <span style={{ color: token.colorText, fontSize: 13 }}>
                  {realName || "用户"}
                </span>
              </Space>
            </Dropdown>
          </Space>
        </StyledHeader>

        {/* 面包屑 */}
        <StyledBreadcrumbWrapper
          $bg={token.colorBgLayout}
          $borderColor={token.colorBorderSecondary}
        >
          <Breadcrumb items={getBreadcrumbItems()} />
        </StyledBreadcrumbWrapper>

        {/* 主内容：flex: 1 占满剩余高度，overflow-y: auto 独立滚动 */}
        <StyledContent>
          <Outlet />
        </StyledContent>
      </StyledContentLayout>
    </Layout>
  );
}
