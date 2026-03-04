import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, Space, message } from 'antd'
import { UserOutlined, LockOutlined, MedicineBoxOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { authApi } from '@/api/auth'
import { setCredentials } from '@/store/slices/authSlice'

const { Title, Text } = Typography

export default function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

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
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <Space direction="vertical" align="center" style={{ width: '100%', marginBottom: 32 }}>
          <MedicineBoxOutlined style={{ fontSize: 48, color: '#6366f1' }} />
          <Title level={3} style={{ margin: 0 }}>智能医疗耗材管理系统</Title>
          <Text type="secondary">请登录您的账户</Text>
        </Space>
        <Form onFinish={onFinish} size="large" initialValues={{ username: 'admin', password: 'Admin@123456' }}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}
              style={{ background: '#6366f1', borderColor: '#6366f1', height: 44 }}>
              登 录
            </Button>
          </Form.Item>
        </Form>
        <Text type="secondary" style={{ fontSize: 12 }}>
          默认账户：admin / Admin@123456
        </Text>
      </Card>
    </div>
  )
}
