#!/usr/bin/env python3
import os
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', '故障保修系统.settings')
django.setup()

from maintenance_app.models import User

print("=== 数据库中的用户 ===")
users = User.objects.all()
if users:
    for user in users:
        print(f"用户名: {user.username}")
        print(f"角色: {user.role}")
        print(f"是否激活: {user.is_active}")
        print(f"是否超级用户: {user.is_superuser}")
        print("---")
else:
    print("没有找到任何用户")

print("\n=== 创建测试用户 ===")
try:
    # 检查是否已存在admin用户
    if not User.objects.filter(username='admin').exists():
        admin_user = User.objects.create_user(
            username='admin',
            password='admin123',
            role='admin',
            is_staff=True,
            is_superuser=True
        )
        print("✅ 创建admin用户成功")
    else:
        print("admin用户已存在")
        
    # 检查是否已存在maintainer用户
    if not User.objects.filter(username='maintainer').exists():
        maintainer_user = User.objects.create_user(
            username='maintainer',
            password='maintainer123',
            role='maintainer'
        )
        print("✅ 创建maintainer用户成功")
    else:
        print("maintainer用户已存在")
        
    # 检查是否已存在reporter用户
    if not User.objects.filter(username='reporter').exists():
        reporter_user = User.objects.create_user(
            username='reporter',
            password='reporter123',
            role='reporter'
        )
        print("✅ 创建reporter用户成功")
    else:
        print("reporter用户已存在")
        
except Exception as e:
    print(f"❌ 创建用户失败: {e}")

print("\n=== 最终用户列表 ===")
users = User.objects.all()
for user in users:
    print(f"用户名: {user.username}, 角色: {user.role}") 