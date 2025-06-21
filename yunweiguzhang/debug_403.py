#!/usr/bin/env python3
"""
调试403错误的脚本
"""
import requests
import json

def debug_403():
    base_url = 'http://localhost:8000'
    
    print("=== 调试403错误 ===")
    
    # 1. 测试服务器是否运行
    print("\n1. 测试服务器连接...")
    try:
        response = requests.get(f'{base_url}/')
        print(f"服务器响应状态: {response.status_code}")
    except Exception as e:
        print(f"无法连接到服务器: {e}")
        return
    
    # 2. 测试CSRF token API
    print("\n2. 测试CSRF token API...")
    try:
        response = requests.get(f'{base_url}/api/csrf-token/')
        print(f"CSRF token响应状态: {response.status_code}")
        if response.status_code == 200:
            print("✓ CSRF token API正常")
        else:
            print(f"✗ CSRF token API失败: {response.text}")
    except Exception as e:
        print(f"✗ CSRF token API异常: {e}")
    
    # 3. 测试登录API（不带任何headers）
    print("\n3. 测试登录API（不带headers）...")
    login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    try:
        response = requests.post(f'{base_url}/api/login/', json=login_data)
        print(f"登录响应状态: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        if response.status_code == 200:
            print("✓ 登录成功")
        else:
            print(f"✗ 登录失败: {response.text}")
    except Exception as e:
        print(f"✗ 登录异常: {e}")
    
    # 4. 测试登录API（带withCredentials）
    print("\n4. 测试登录API（带withCredentials）...")
    session = requests.Session()
    try:
        response = session.post(f'{base_url}/api/login/', json=login_data)
        print(f"登录响应状态: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        if response.status_code == 200:
            print("✓ 登录成功")
        else:
            print(f"✗ 登录失败: {response.text}")
    except Exception as e:
        print(f"✗ 登录异常: {e}")
    
    # 5. 测试current-user API
    print("\n5. 测试current-user API...")
    try:
        response = session.get(f'{base_url}/api/current-user/')
        print(f"Current user响应状态: {response.status_code}")
        if response.status_code == 200:
            print("✓ Current user API正常")
        else:
            print(f"✗ Current user API失败: {response.text}")
    except Exception as e:
        print(f"✗ Current user API异常: {e}")
    
    # 6. 检查Django设置
    print("\n6. 检查Django设置...")
    try:
        response = requests.get(f'{base_url}/api/faults/')
        print(f"故障列表响应状态: {response.status_code}")
        if response.status_code == 200:
            print("✓ 故障列表API正常")
        else:
            print(f"✗ 故障列表API失败: {response.text}")
    except Exception as e:
        print(f"✗ 故障列表API异常: {e}")
    
    print("\n=== 调试完成 ===")

if __name__ == '__main__':
    debug_403() 