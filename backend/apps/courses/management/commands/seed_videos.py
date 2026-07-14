"""
Attach relevant YouTube videos to every lesson.

Sets each lesson's content_type to VIDEO and fills video_url with a
topic-matched YouTube link (cycled across the lessons in a course).
The original text stays in text_content as lesson notes.

Usage:
    python manage.py seed_videos            # update all courses
    python manage.py seed_videos --course git-github-for-teams

Video IDs are well-known free tutorials; swap any in VIDEOS_BY_SLUG below.
"""
from django.core.management.base import BaseCommand
from apps.courses.models import Course, Lesson

YT = 'https://www.youtube.com/watch?v='

# Per-course pools of YouTube video IDs, keyed by course slug.
VIDEOS_BY_SLUG = {
    'python-mastery-from-zero-to-hero': [
        'rfscVS0vtbw',  # Python Full Course for Beginners (freeCodeCamp)
        '_uQrJ0TkZlc',  # Python Full Course (Mosh)
        'kqtD5dpn9C8',  # Python for Beginners (Mosh)
    ],
    'django-rest-framework-build-professional-apis': [
        'F5mRW0jo-U4',  # Django Full Course (freeCodeCamp)
        'c708Nf0cHrs',  # Django REST Framework
        'rfscVS0vtbw',  # Python refresher
    ],
    'machine-learning-with-python': [
        'i_LwzRVP7bg',  # Machine Learning for Everybody (freeCodeCamp)
        '7eh4d6sabA0',  # Python ML tutorial
        'NWONeJKn6kc',  # Deep learning intro
    ],
    'data-analysis-with-pandas-numpy': [
        'r-uOLxNrNk8',  # Data Analysis with Python (freeCodeCamp)
        'vmEHCJofslg',  # Pandas tutorial
        'QUT1VHiLmmI',  # NumPy tutorial
    ],
    'ui-ux-design-fundamentals': [
        'c9Wg6Cb_YlU',  # UI/UX design tutorial
        'FTFaQWZBqQ8',  # Figma tutorial for beginners
        'wIuVvCuiJhU',  # Design principles
    ],
    'react-for-designers': [
        'w7ejDZ8SWv8',  # React Course (freeCodeCamp)
        'Ke90Tje7VS0',  # React Crash Course (Traversy)
        'SqcY0GlETPk',  # React tutorial
    ],
    'git-github-for-teams': [
        'RGOj5yH7evk',  # Git and GitHub for Beginners (freeCodeCamp)
        '8JJ101D3knE',  # Git Tutorial (Mosh)
        'nhNq2kIvi9s',  # GitHub Actions CI/CD
    ],
    'sql-database-design': [
        'HXV3zeQKqGY',  # SQL Full Course (freeCodeCamp)
        '7S_tz1z_5bA',  # MySQL Tutorial (Mosh)
        'ztHopE5Wnpc',  # Database design course
    ],
}

# Fallback pool for any course/lesson not explicitly mapped.
DEFAULT_POOL = ['rfscVS0vtbw', 'HXV3zeQKqGY', 'RGOj5yH7evk', 'w7ejDZ8SWv8']


class Command(BaseCommand):
    help = 'Attach YouTube videos to all lessons'

    def add_arguments(self, parser):
        parser.add_argument('--course', help='Limit to a single course slug')

    def handle(self, *args, **options):
        courses = Course.objects.all()
        if options.get('course'):
            courses = courses.filter(slug=options['course'])

        total = 0
        for course in courses:
            pool = VIDEOS_BY_SLUG.get(course.slug, DEFAULT_POOL)
            lessons = Lesson.objects.filter(module__course=course).order_by(
                'module__order', 'order', 'id'
            )
            for i, lesson in enumerate(lessons):
                lesson.content_type = 'VIDEO'
                lesson.video_url = YT + pool[i % len(pool)]
                lesson.save(update_fields=['content_type', 'video_url'])
                total += 1
            self.stdout.write(self.style.SUCCESS(
                f'  * {course.title}: {lessons.count()} lessons -> video'
            ))

        self.stdout.write(self.style.SUCCESS(f'\nDone. Updated {total} lessons.'))
