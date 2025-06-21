# maintenance_app/serializers.py

from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import User, Route, EquipmentType, Fault, MaintenanceRecord, MaintenancePhoto, Department

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=4)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'role', 'department', 'department_name']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        # 创建用户时加密密码
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # 更新用户时，如果提供了密码则加密
        if 'password' in validated_data and validated_data['password']:
            validated_data['password'] = make_password(validated_data['password'])
        else:
            # 如果没有提供密码，从validated_data中移除password字段
            validated_data.pop('password', None)
        return super().update(instance, validated_data)

class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = '__all__'

class EquipmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipmentType
        fields = '__all__'

class MaintenancePhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = MaintenancePhoto
        fields = ['id', 'image', 'image_url', 'photo_type', 'uploaded_at']
        read_only_fields = ['uploaded_at']

    def get_image_url(self, obj):
        # 返回图片的完整URL，包括域名
        request = self.context.get('request')
        if request is not None:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

class MaintenanceRecordSerializer(serializers.ModelSerializer):
    maintainer_name = serializers.CharField(source='maintainer.username', read_only=True)
    maintainer_department = serializers.CharField(source='maintainer.department.name', read_only=True)
    photos = MaintenancePhotoSerializer(many=True, read_only=True) # 嵌套序列化照片
    equipment_name = serializers.CharField(source='fault.equipment_name', read_only=True)
    center_stake_number = serializers.CharField(source='fault.center_stake_number', read_only=True)
    specific_location = serializers.CharField(source='fault.specific_location', read_only=True)
    reporter_name = serializers.CharField(source='fault.reporter.username', read_only=True)
    reporter_department = serializers.CharField(source='fault.reporter.department.name', read_only=True)

    class Meta:
        model = MaintenanceRecord
        fields = [
            'id', 'fault', 'maintainer', 'maintainer_name', 'maintainer_department', 'arrived_at', 'completed_at',
            'maintenance_vehicle', 'required_tools_materials', 'fault_reason_analysis',
            'maintenance_process_result', 'remarks', 'created_at', 'updated_at', 'photos',
            'equipment_name', 'center_stake_number', 'specific_location', 'reporter_name', 'reporter_department'
        ]
        read_only_fields = ['maintainer', 'created_at', 'updated_at']

class FaultSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source='reporter.username', read_only=True)
    reporter_department = serializers.CharField(source='reporter.department.name', read_only=True)
    route_name = serializers.CharField(source='route.name', read_only=True)
    route_code = serializers.CharField(source='route.code', read_only=True)
    maintenance_record = serializers.PrimaryKeyRelatedField(read_only=True)
    maintenance_record_detail = MaintenanceRecordSerializer(source='maintenance_record', read_only=True)

    class Meta:
        model = Fault
        fields = [
            'id', 'reporter', 'reporter_name', 'reporter_department', 'route', 'route_name', 'route_code',
            'center_stake_number', 'equipment_name', 'specific_location',
            'description', 'reported_at', 'status', 'urgency', 'updated_at', 
            'maintenance_record', 'maintenance_record_detail'
        ]
        read_only_fields = ['reporter', 'status', 'reported_at', 'updated_at'] # 初始上报时，这些字段由系统控制

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'description']

