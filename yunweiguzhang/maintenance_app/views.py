from django.shortcuts import render

# Create your views here.
# maintenance_app/views.py

from rest_framework import viewsets, status, generics
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count, Avg, F, ExpressionWrapper, fields, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from datetime import date, timedelta
from django.utils import timezone # 用于获取带时区的时间
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
from django.http import JsonResponse

from .models import User, Route, EquipmentType, Fault, MaintenanceRecord, MaintenancePhoto, Department
from .serializers import (
    UserSerializer, RouteSerializer, EquipmentTypeSerializer,
    FaultSerializer, MaintenanceRecordSerializer, MaintenancePhotoSerializer,
    DepartmentSerializer
)
from .permissions import IsReporter, IsMaintainer, IsAdmin, IsMaintainerOrAdmin, CanViewMaintenanceRecord # 自定义权限


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    """获取CSRF token的API"""
    return JsonResponse({'csrfToken': get_token(request)})


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """自定义登录API"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({'detail': '用户名和密码不能为空'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    if user is not None:
        login(request, user)
        # 确保session被保存
        request.session.save()
        return Response({'detail': '登录成功', 'user': UserSerializer(user).data})
    else:
        return Response({'detail': '用户名或密码错误'}, status=status.HTTP_401_UNAUTHORIZED)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    """自定义退出登录API"""
    if request.user.is_authenticated:
        logout(request)
        # 清除session
        request.session.flush()
        request.session.delete()
    
    # 设置响应，清除session cookie
    response = Response({'detail': '退出登录成功'})
    response.delete_cookie('sessionid')
    response.delete_cookie('csrftoken')
    
    # 设置cookie过期时间为过去的时间
    response.set_cookie('sessionid', '', expires='Thu, 01 Jan 1970 00:00:00 GMT', path='/')
    response.set_cookie('csrftoken', '', expires='Thu, 01 Jan 1970 00:00:00 GMT', path='/')
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """获取当前登录用户信息"""
    return Response({
        'user': UserSerializer(request.user).data,
        'is_admin': request.user.role == User.ROLE_ADMIN,
        'is_maintainer': request.user.role == User.ROLE_MAINTAINER,
        'is_reporter': request.user.role == User.ROLE_REPORTER,
    })


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    
    def get_permissions(self):
        """
        根据操作类型设置不同的权限
        - 查看用户列表：管理员和运维人员都可以
        - 创建、修改、删除用户：只有管理员可以
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsMaintainerOrAdmin]
        else:
            permission_classes = [IsAdmin]
        return [permission() for permission in permission_classes]

class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all().order_by('name')
    serializer_class = RouteSerializer
    permission_classes = [IsAdmin] # 只有管理员可以管理路线信息

class EquipmentTypeViewSet(viewsets.ModelViewSet):
    queryset = EquipmentType.objects.all().order_by('name')
    serializer_class = EquipmentTypeSerializer
    permission_classes = [IsAdmin] # 只有管理员可以管理设备类型

class FaultViewSet(viewsets.ModelViewSet):
    queryset = Fault.objects.all().select_related('reporter', 'route').order_by('-reported_at')
    serializer_class = FaultSerializer
    permission_classes = [IsAuthenticated] # 默认所有操作都需要认证

    def get_permissions(self):
        """
        根据操作类型设置不同的权限
        - 查看：所有认证用户
        - 创建：所有认证用户
        - 更新：上报人自己或运维人员
        - 删除：上报人自己（仅限待处理状态）
        """
        if self.action in ['list', 'retrieve', 'create']:
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [IsAuthenticated]  # 在perform_update中检查权限
        elif self.action == 'destroy':
            permission_classes = [IsAuthenticated]  # 在perform_destroy中检查权限
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        # 根据用户角色过滤故障列表
        user = self.request.user
        if user.is_authenticated:
            if user.role == User.ROLE_REPORTER:
                # 收费站人员只能看自己上报的，且不显示已解决/无法解决
                return self.queryset.filter(reporter=user).exclude(status__in=[Fault.STATUS_RESOLVED, Fault.STATUS_CANNOT_RESOLVE])
            elif user.role == User.ROLE_MAINTAINER:
                # 运维人员看所有待处理和处理中的，以及自己处理过的（不显示已解决/无法解决）
                return self.queryset.filter(
                    Q(status__in=[Fault.STATUS_PENDING, Fault.STATUS_IN_PROGRESS]) |
                    Q(maintenance_record__maintainer=user)
                ).exclude(status__in=[Fault.STATUS_RESOLVED, Fault.STATUS_CANNOT_RESOLVE]).distinct()
            elif user.role == User.ROLE_ADMIN:
                # 管理员看所有未解决的
                return self.queryset.exclude(status__in=[Fault.STATUS_RESOLVED, Fault.STATUS_CANNOT_RESOLVE])
        return Fault.objects.none() # 未认证用户看不到任何故障

    def perform_create(self, serializer):
        # 故障上报时，自动设置上报人
            serializer.save(reporter=self.request.user, status=Fault.STATUS_PENDING)

    def perform_update(self, serializer):
        # 检查更新权限：只有上报人自己或运维人员可以更新
        fault = serializer.instance
        user = self.request.user
        
        if user.role == User.ROLE_ADMIN:
            # 管理员可以更新所有故障
            serializer.save()
        elif user.role == User.ROLE_MAINTAINER:
            # 运维人员可以更新故障状态
            serializer.save()
        elif user.role == User.ROLE_REPORTER and fault.reporter == user:
            # 上报人只能更新自己的故障
            serializer.save()
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("您没有权限更新此故障")

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == User.ROLE_ADMIN:
            instance.delete()
        elif instance.reporter == user and instance.status == Fault.STATUS_PENDING:
            instance.delete()
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("您没有权限删除此故障，或故障状态不允许删除")

    @action(detail=True, methods=['post'], permission_classes=[IsMaintainerOrAdmin])
    def accept_fault(self, request, pk=None):
        """运维人员接受故障，状态变为处理中"""
        fault = self.get_object()
        if fault.status == Fault.STATUS_PENDING:
            fault.status = Fault.STATUS_IN_PROGRESS
            fault.save()
            # 创建空的维修记录关联
            MaintenanceRecord.objects.get_or_create(fault=fault, defaults={'maintainer': request.user})
            return Response(self.get_serializer(fault).data)
        return Response({"detail": "故障状态不正确，无法接受。"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], serializer_class=MaintenanceRecordSerializer, permission_classes=[IsMaintainerOrAdmin])
    def resolve_fault(self, request, pk=None):
        """运维人员完成维修，解决故障"""
        try:
            fault = self.get_object()
            print(f"处理故障 ID: {fault.id}, 当前状态: {fault.status}")
            
            if fault.status in [Fault.STATUS_IN_PROGRESS, Fault.STATUS_PENDING]:
                # 获取或创建维修记录
                maintenance_record, created = MaintenanceRecord.objects.get_or_create(
                    fault=fault,
                    defaults={'maintainer': request.user}
                )
                print(f"维修记录 {'创建' if created else '已存在'}, ID: {maintenance_record.id}")

                # 更新维修记录信息
                print(f"接收到的数据: {request.data}")
                serializer = MaintenanceRecordSerializer(maintenance_record, data=request.data, partial=True)
                
                if not serializer.is_valid():
                    print(f"序列化器验证失败: {serializer.errors}")
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
                print("序列化器验证通过")
                serializer.save(maintainer=request.user) # 确保维护人员是当前操作者

                # 更改故障状态为已解决
                fault.status = Fault.STATUS_RESOLVED
                fault.save()
                print(f"故障状态已更新为: {fault.status}")

                # 这里返回当前用户可见的故障列表
                queryset = self.get_queryset()
                fault_list = FaultSerializer(queryset, many=True, context={'request': request}).data
                return Response({'faults': fault_list})
            else:
                print(f"故障状态不正确: {fault.status}")
                return Response({"detail": "故障状态不正确，无法标记为已解决。"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"resolve_fault 发生异常: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"detail": f"服务器内部错误: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ... 其他自定义动作，例如设置无法解决
    @action(detail=True, methods=['post'], permission_classes=[IsMaintainerOrAdmin])
    def cannot_resolve_fault(self, request, pk=None):
        """运维人员标记故障为无法解决"""
        fault = self.get_object()
        if fault.status not in [Fault.STATUS_RESOLVED, Fault.STATUS_CANNOT_RESOLVE]:
            fault.status = Fault.STATUS_CANNOT_RESOLVE
            fault.save()
            return Response(self.get_serializer(fault).data)
        return Response({"detail": "故障状态不正确，无法标记为无法解决。"}, status=status.HTTP_400_BAD_REQUEST)


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.all().select_related('fault', 'maintainer').prefetch_related('photos').order_by('-created_at')
    serializer_class = MaintenanceRecordSerializer
    permission_classes = [CanViewMaintenanceRecord] # 使用新的权限类

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.role == User.ROLE_MAINTAINER:
            # 运维人员只能看自己处理过的
            return self.queryset.filter(maintainer=user)
        elif user.is_authenticated and user.role == User.ROLE_ADMIN:
            # 管理员看所有
            return self.queryset
        elif user.is_authenticated and user.role == User.ROLE_REPORTER:
            # 收费站工作人员只能看自己上报的故障的维修记录
            return self.queryset.filter(fault__reporter=user)
        return MaintenanceRecord.objects.none()

    def destroy(self, request, *args, **kwargs):
        user = request.user
        if not user.is_authenticated or user.role != User.ROLE_ADMIN:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("只有管理员可以删除维修记录")
        return super().destroy(request, *args, **kwargs)


class MaintenancePhotoViewSet(viewsets.ModelViewSet):
    queryset = MaintenancePhoto.objects.all().order_by('-uploaded_at')
    serializer_class = MaintenancePhotoSerializer
    permission_classes = [IsMaintainerOrAdmin] # 只有运维和管理员可以上传和管理照片

    def perform_create(self, serializer):
        # 确保图片关联到正确的维修记录
        maintenance_record_id = self.request.data.get('maintenance_record')
        if not maintenance_record_id:
            raise serializers.ValidationError({"detail": "必须提供维修记录ID。"})
        try:
            maintenance_record = MaintenanceRecord.objects.get(id=maintenance_record_id)
        except MaintenanceRecord.DoesNotExist:
            raise serializers.ValidationError({"detail": "指定的维修记录不存在。"})

        serializer.save(maintenance_record=maintenance_record)


# ---------------- 统计视图 ----------------
class FaultStatsView(generics.GenericAPIView):
    permission_classes = [IsMaintainerOrAdmin] # 运维和管理员都可以查看统计数据

    def get(self, request, *args, **kwargs):
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        interval = request.query_params.get('interval', 'day') # day, week, month
        route_id = request.query_params.get('route_id')
        equipment_name = request.query_params.get('equipment_name')

        queryset = Fault.objects.all()

        if start_date_str:
            start_date = date.fromisoformat(start_date_str)
            queryset = queryset.filter(reported_at__gte=start_date)
        if end_date_str:
            end_date = date.fromisoformat(end_date_str)
            queryset = queryset.filter(reported_at__lte=end_date + timedelta(days=1)) # 包含结束日当天

        if route_id:
            queryset = queryset.filter(route_id=route_id)
        if equipment_name:
            queryset = queryset.filter(equipment_name__icontains=equipment_name) # 模糊匹配设备名称

        # 按日期统计
        date_trunc_map = {
            'day': TruncDay('reported_at'),
            'week': TruncWeek('reported_at'),
            'month': TruncMonth('reported_at'),
        }
        if interval in date_trunc_map:
            faults_by_date = queryset.annotate(
                date_group=date_trunc_map[interval]
            ).values('date_group').annotate(
                total_faults=Count('id'),
                pending_faults=Count('id', filter=Q(status=Fault.STATUS_PENDING)),
                in_progress_faults=Count('id', filter=Q(status=Fault.STATUS_IN_PROGRESS)),
                resolved_faults=Count('id', filter=Q(status=Fault.STATUS_RESOLVED)),
                cannot_resolve_faults=Count('id', filter=Q(status=Fault.STATUS_CANNOT_RESOLVE)),
            ).order_by('date_group')
        else:
            faults_by_date = [] # 或返回错误

        # 按路线统计
        faults_by_route = queryset.values('route__name').annotate(
            total_faults=Count('id'),
            pending_faults=Count('id', filter=Q(status=Fault.STATUS_PENDING)),
            in_progress_faults=Count('id', filter=Q(status=Fault.STATUS_IN_PROGRESS)),
            resolved_faults=Count('id', filter=Q(status=Fault.STATUS_RESOLVED)),
            cannot_resolve_faults=Count('id', filter=Q(status=Fault.STATUS_CANNOT_RESOLVE)),
        ).order_by('route__name')

        # 按设备统计
        faults_by_equipment = queryset.values('equipment_name').annotate(
            total_faults=Count('id'),
            pending_faults=Count('id', filter=Q(status=Fault.STATUS_PENDING)),
            in_progress_faults=Count('id', filter=Q(status=Fault.STATUS_IN_PROGRESS)),
            resolved_faults=Count('id', filter=Q(status=Fault.STATUS_RESOLVED)),
            cannot_resolve_faults=Count('id', filter=Q(status=Fault.STATUS_CANNOT_RESOLVE)),
        ).order_by('-total_faults')

        # 平均处理时间
        avg_processing_time = MaintenanceRecord.objects.filter(
            fault__reported_at__gte=start_date if start_date_str else date(1970, 1, 1), # 默认一个很早的日期
            fault__reported_at__lte=end_date + timedelta(days=1) if end_date_str else timezone.now().date() + timedelta(days=1),
            completed_at__isnull=False,
            arrived_at__isnull=False
        ).annotate(
            duration=ExpressionWrapper(
                F('completed_at') - F('arrived_at'),
                output_field=fields.DurationField()
            )
        ).aggregate(
            avg_duration=Avg('duration')
        )['avg_duration']

        avg_processing_time_seconds = avg_processing_time.total_seconds() if avg_processing_time else 0
        avg_processing_time_hours = avg_processing_time_seconds / 3600 # 转换为小时

        return Response({
            'faults_by_date': faults_by_date,
            'faults_by_route': faults_by_route,
            'faults_by_equipment': faults_by_equipment,
            'average_processing_time_hours': round(avg_processing_time_hours, 2)
        })


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

