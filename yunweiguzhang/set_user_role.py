#!/usr/bin/env python
import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', '故障保修系统.settings')
django.setup()

from maintenance_app.models import User

def set_user_role():
    try:
        # 获取用户
        user = User.objects.get(username='weiwei')
        print(f'当前用户: {user.username}, 角色: {user.role}')
        
        # 设置为管理员角色
        user.role = User.ROLE_ADMIN
        user.save()
        
        print(f'已成功将用户 {user.username} 设置为管理员角色')
        
        # 验证设置
        user.refresh_from_db()
        print(f'验证: 用户 {user.username} 的角色现在是 {user.role}')
        
    except User.DoesNotExist:
        print('用户 weiwei 不存在，请先创建用户')
    except Exception as e:
        print(f'设置角色时出错: {e}')

if __name__ == '__main__':
    set_user_role() 