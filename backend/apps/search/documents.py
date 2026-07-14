from django_elasticsearch_dsl import Document, fields, Index
from django_elasticsearch_dsl.registries import registry
from apps.courses.models import Course

COURSE_INDEX = Index('courses')
COURSE_INDEX.settings(
    number_of_shards=1,
    number_of_replicas=0,
)


@registry.register_document
class CourseDocument(Document):
    """Elasticsearch document mapping for Course model."""

    mentor_name = fields.TextField(attr='mentor_name_field')
    mentor_username = fields.KeywordField()
    tag_list = fields.KeywordField()

    class Index:
        name = 'courses'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
        }

    class Django:
        model = Course
        fields = [
            'id',
            'title',
            'description',
            'short_description',
            'price',
            'level',
            'language',
            'avg_rating',
            'total_reviews',
            'total_enrollments',
            'duration_hours',
            'tags',
            'status',
        ]
        # Auto-update the Elasticsearch index when Course objects change
        related_models = []

    def prepare_mentor_name(self, instance):
        name = f"{instance.mentor.first_name} {instance.mentor.last_name}".strip()
        return name or instance.mentor.username

    def prepare_mentor_username(self, instance):
        return instance.mentor.username

    def prepare_tag_list(self, instance):
        return instance.tag_list
