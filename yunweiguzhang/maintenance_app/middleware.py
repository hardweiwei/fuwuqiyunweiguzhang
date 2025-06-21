import re
from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware

class CustomCsrfViewMiddleware(CsrfViewMiddleware):
    """
    自定义CSRF中间件，支持豁免特定URL
    """
    def process_view(self, request, callback, callback_args, callback_kwargs):
        # 检查URL是否在豁免列表中
        if hasattr(settings, 'CSRF_EXEMPT_URLS'):
            for pattern in settings.CSRF_EXEMPT_URLS:
                if re.match(pattern, request.path_info):
                    return None  # 豁免CSRF检查
        
        # 对于其他URL，使用默认的CSRF检查
        return super().process_view(request, callback, callback_args, callback_kwargs)

class DisableCsrfMiddleware:
    """
    完全禁用CSRF的中间件
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 在请求处理前设置CSRF豁免
        setattr(request, '_dont_enforce_csrf_checks', True)
        response = self.get_response(request)
        return response 