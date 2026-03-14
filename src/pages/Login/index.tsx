import { useState, useEffect } from 'react'
import { Form, Input, Button, Typography, message, Checkbox } from 'antd'
import {
  UserOutlined, LockOutlined, MedicineBoxOutlined,
  SafetyCertificateOutlined, DashboardOutlined,
  AlertOutlined, BarChartOutlined, RobotOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { authApi } from '@/api/auth'
import { setCredentials } from '@/store/slices/authSlice'

const { Title, Text } = Typography

/* ── 与系统一致的配色体系 ── */
const BRAND = {
  primary: '#6366f1',      // 系统主色（靛蓝紫）
  primaryLight: '#818cf8',
  accent: '#0ea5e9',       // 辅助色（天蓝）
  success: '#10b981',      // 状态绿
  bgDark: '#1e1b4b',       // Dashboard 横幅深色
  bgMid: '#312e81',
  bgDeep: '#1e3a5f',
  text: '#1e293b',
  textSecondary: '#64748b',
  textDim: 'rgba(255,255,255,0.5)',
}

const FEATURES = [
  { icon: <RobotOutlined />, title: 'AI 智能中枢', desc: '健康评分与实时洞察' },
  { icon: <DashboardOutlined />, title: '精细管控', desc: '科室定数与异常检测' },
  { icon: <SafetyCertificateOutlined />, title: '全链追溯', desc: 'UDI 到患者完整链路' },
  { icon: <AlertOutlined />, title: '智能预警', desc: '临期处置与补货建议' },
  { icon: <BarChartOutlined />, title: '数据报表', desc: '消耗趋势与月度报告' },
]

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const data = await authApi.login(values)
      dispatch(setCredentials(data))
      message.success('登录成功')
      navigate('/dashboard')
    } catch {
      // 错误由 axios 拦截器处理
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: `linear-gradient(135deg, ${BRAND.bgDark} 0%, ${BRAND.bgMid} 40%, ${BRAND.bgDeep} 100%)`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* ── 背景装饰（与 Dashboard 横幅一致） ── */}
      {/* 网格 */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      {/* 光晕 */}
      <div style={{ position: 'absolute', top: -120, right: '30%', width: 300, height: 300,
        borderRadius: '50%', background: `rgba(99,102,241,0.12)`, filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: '10%', width: 240, height: 240,
        borderRadius: '50%', background: 'rgba(14,165,233,0.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '40%', right: '5%', width: 160, height: 160,
        borderRadius: '50%', background: 'rgba(16,185,129,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      {/* ── 左侧品牌区 ── */}
      <div style={{
        flex: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 48px', position: 'relative', zIndex: 1,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }} className="login-brand-area">
        <div style={{ maxWidth: 560, width: '100%' }}>

        {/* Logo（复用系统侧边栏 Logo 风格） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 52 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, position: 'relative',
            background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryLight})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 16px rgba(99,102,241,0.4)`,
          }}>
            <MedicineBoxOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
              智能医疗耗材系统
            </div>
            <div style={{ color: BRAND.textDim, fontSize: 13, letterSpacing: 1.5, marginTop: 3 }}>
              SMART MEDICAL SUPPLY
            </div>
          </div>
        </div>

        {/* 标题 */}
        <Title level={1} style={{
          color: '#fff', fontSize: 46, fontWeight: 800, lineHeight: 1.2,
          margin: '0 0 20px', letterSpacing: -0.5,
        }}>
          全流程数智化
          <br />
          <span style={{
            background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            耗材管理平台
          </span>
        </Title>

        <Text style={{
          color: 'rgba(148,163,184,0.8)', fontSize: 17, lineHeight: 1.8,
          display: 'block', maxWidth: 500, marginBottom: 44,
        }}>
          覆盖采购入库、科室消耗、异常检测到智能补货的完整闭环，
          AI 驱动精细化管理，助力医院降本增效。
        </Text>

        {/* 特性标签（与 Dashboard 统计卡片风格呼应） */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, maxWidth: 540 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 0.4s ease',
              transitionDelay: `${0.3 + i * 0.08}s`,
              cursor: 'default',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.12)'
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            >
              <span style={{ color: BRAND.primaryLight, fontSize: 20 }}>{f.icon}</span>
              <div>
                <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{f.title}</div>
                <div style={{ color: 'rgba(148,163,184,0.6)', fontSize: 12 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 底部状态指示（与 Dashboard AI 横幅风格一致） */}
        <div style={{
          marginTop: 52, display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 12, maxWidth: 360,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%',
            background: BRAND.success,
            boxShadow: `0 0 8px ${BRAND.success}`,
            animation: 'pulse-dot 2s ease-in-out infinite',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
            系统运行正常 · AI 智能中枢就绪
          </span>
        </div>
        </div>{/* end max-width wrapper */}
      </div>

      {/* ── 右侧登录表单 ── */}
      <div style={{
        flex: 4, minWidth: 420, maxWidth: 560,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 56px', background: '#fff', position: 'relative', zIndex: 1,
        borderRadius: '24px 0 0 24px',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateX(0)' : 'translateX(16px)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: '0.1s',
      }} className="login-form-area">
        <div style={{ width: '100%', maxWidth: 340 }}>
          {/* 标题 */}
          <div style={{ marginBottom: 32 }}>
            <Title level={3} style={{
              margin: '0 0 6px', fontWeight: 700, color: BRAND.text, fontSize: 24,
            }}>
              欢迎回来
            </Title>
            <Text style={{ color: BRAND.textSecondary, fontSize: 14 }}>
              登录您的账户以继续
            </Text>
          </div>

          {/* 表单 */}
          <Form
            onFinish={onFinish}
            size="large"
            layout="vertical"
            initialValues={{ username: 'admin', password: 'Admin@123456' }}
            requiredMark={false}
          >
            <Form.Item
              name="username"
              label={<span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>用户名</span>}
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                placeholder="请输入用户名"
                style={{ height: 46, borderRadius: 10, border: '1.5px solid #e2e8f0' }}
                styles={{ input: { marginLeft: 4 } }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>密码</span>}
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="请输入密码"
                style={{ height: 46, borderRadius: 10, border: '1.5px solid #e2e8f0' }}
                styles={{ input: { marginLeft: 4 } }}
              />
            </Form.Item>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              margin: '-8px 0 20px',
            }}>
              <Checkbox defaultChecked>
                <span style={{ color: BRAND.textSecondary, fontSize: 13 }}>记住我</span>
              </Checkbox>
            </div>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{
                  height: 46, borderRadius: 10, fontWeight: 600, fontSize: 15,
                  background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryLight})`,
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                }}
              >
                登 录
              </Button>
            </Form.Item>
          </Form>

          {/* 演示提示（与系统 Tag 风格一致） */}
          <div style={{
            marginTop: 24, padding: '12px 14px', borderRadius: 10,
            background: '#f5f3ff', border: '1px solid #e9e5ff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <SafetyCertificateOutlined style={{ color: BRAND.primary, fontSize: 13 }} />
              <span style={{ color: BRAND.primary, fontSize: 12, fontWeight: 600 }}>演示账号</span>
            </div>
            <div style={{ color: BRAND.textSecondary, fontSize: 12, lineHeight: 1.8 }}>
              管理员：admin / Admin@123456<br />
              护士长：nurse1 / Admin@123456
            </div>
          </div>

          {/* 版权 */}
          <div style={{ marginTop: 28, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
            &copy; {new Date().getFullYear()} 智能医疗耗材管理系统
          </div>
        </div>
      </div>

      {/* ── 全局样式 ── */}
      <style>{`
        @media (max-width: 900px) {
          .login-brand-area { display: none !important; }
          .login-form-area {
            flex: 1 !important;
            max-width: 100% !important;
            min-width: 0 !important;
            border-radius: 0 !important;
            min-height: 100vh;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0s !important; transition-duration: 0s !important; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .login-form-area .ant-input:focus,
        .login-form-area .ant-input-affix-wrapper:focus,
        .login-form-area .ant-input-affix-wrapper-focused {
          border-color: ${BRAND.primary} !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important;
        }
        .login-form-area .ant-btn-primary:hover {
          box-shadow: 0 6px 20px rgba(99,102,241,0.4) !important;
          transform: translateY(-1px);
        }
        .login-form-area .ant-btn-primary:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  )
}
