from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from elasticsearch_dsl import Q as ESQ

from .documents import CourseDocument


class CourseSearchView(APIView):
    """Full-text search for courses using Elasticsearch."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '')
        level = request.query_params.get('level', '')
        language = request.query_params.get('language', '')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        min_rating = request.query_params.get('min_rating')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 12))

        s = CourseDocument.search()

        # Only show published courses
        s = s.filter('term', status='PUBLISHED')

        # Full-text search
        if query:
            s = s.query(
                ESQ('multi_match',
                    query=query,
                    fields=['title^3', 'description', 'short_description',
                            'tags^2', 'mentor_name'],
                    fuzziness='AUTO',
                    type='best_fields')
            )

        # Filters
        if level:
            s = s.filter('term', level=level)
        if language:
            s = s.filter('term', language__keyword=language)
        if min_price is not None:
            s = s.filter('range', price={'gte': float(min_price)})
        if max_price is not None:
            s = s.filter('range', price={'lte': float(max_price)})
        if min_rating:
            s = s.filter('range', avg_rating={'gte': float(min_rating)})

        # Pagination
        start = (page - 1) * page_size
        s = s[start:start + page_size]

        response = s.execute()

        results = []
        for hit in response:
            results.append({
                'id': hit.id,
                'title': hit.title,
                'short_description': getattr(hit, 'short_description', ''),
                'price': float(hit.price) if hit.price else 0,
                'level': hit.level,
                'language': hit.language,
                'avg_rating': float(hit.avg_rating) if hit.avg_rating else 0,
                'total_reviews': hit.total_reviews,
                'total_enrollments': hit.total_enrollments,
                'duration_hours': hit.duration_hours,
                'mentor_name': getattr(hit, 'mentor_name', ''),
                'score': hit.meta.score,
            })

        return Response({
            'count': response.hits.total.value,
            'page': page,
            'page_size': page_size,
            'results': results,
        })


class AutocompleteView(APIView):
    """Autocomplete suggestions for course search."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '')
        if len(query) < 2:
            return Response({'suggestions': []})

        s = CourseDocument.search()
        s = s.filter('term', status='PUBLISHED')
        s = s.query(
            ESQ('multi_match',
                query=query,
                fields=['title^3', 'tags^2'],
                type='phrase_prefix')
        )
        s = s[:5]  # Limit to 5 suggestions

        response = s.execute()
        suggestions = [{'id': hit.id, 'title': hit.title} for hit in response]

        return Response({'suggestions': suggestions})
