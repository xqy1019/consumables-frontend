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
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)]">
      <Card
        className="w-[420px] rounded-xl"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        <Space direction="vertical" align="center" className="w-full mb-8">
          <MedicineBoxOutlined className="text-[48px] text-[#6366f1]" />
          <Title level={3} className="!m-0">智能医疗耗材管理系统</Title>
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
            <Button type="primary" htmlType="submit" block loading={loading} className="h-11">
              登 录
            </Button>
          </Form.Item>
        </Form>
        <Text type="secondary" className="text-xs">
          默认账户：admin / Admin@123456
        </Text>
      </Card>
    </div>
  )
}
