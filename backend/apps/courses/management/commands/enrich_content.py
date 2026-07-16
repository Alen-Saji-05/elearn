"""
Enrich already-seeded courses with fuller reading content and real quizzes.

Non-destructive: run any time after `seed`. It
  - expands each lesson's `text_content` into a few readable paragraphs, and
  - ensures the first lesson of every module has a quiz with 3 answerable
    questions, and replaces any placeholder quiz questions with real ones.

    python manage.py enrich_content
"""
import random
from django.core.management.base import BaseCommand

from apps.courses.models import Course, Lesson, Quiz, QuizQuestion


def summary_of(lesson):
    """First sentence of the lesson's existing blurb (fallback: the title)."""
    text = (lesson.text_content or '').strip()
    if not text:
        return lesson.title
    first = text.split('\n')[0].split('. ')[0].strip().rstrip('.')
    return first or lesson.title


def reading_for(lesson, course, blurb):
    title = lesson.title
    return (
        f"{blurb}.\n\n"
        f"In this lesson, \"{title}\", you'll build a clear, practical understanding "
        f"of the topic and see how it fits into the wider \"{course.title}\" course. "
        f"We start with the core ideas, then work through concrete examples so the "
        f"concepts actually stick.\n\n"
        f"By the end you should be able to explain the key terms in your own words, "
        f"recognise when to apply them, and avoid the mistakes people most often make "
        f"when they're starting out. Watch the video first, then use these notes to "
        f"review and reinforce what you saw.\n\n"
        f"Key takeaways:\n"
        f"- {title} is a building block you'll reuse throughout {course.title}.\n"
        f"- Focus on the \"why\" behind each step, not just the \"how\".\n"
        f"- Try the examples yourself before moving on to the next lesson."
    )


class Command(BaseCommand):
    help = 'Expand reading text and add real quizzes to seeded courses'

    def handle(self, *args, **options):
        levels = dict(Course.Level.choices)  # value -> label
        # Pool of lesson summaries used as plausible wrong answers.
        summary_pool = [summary_of(l) for l in Lesson.objects.all()]
        module_titles = list(
            Course.objects.values_list('modules__title', flat=True).distinct()
        )
        module_titles = [m for m in module_titles if m]

        lessons_updated = 0
        quizzes_ready = 0

        for course in Course.objects.prefetch_related('modules__lessons').all():
            for module in course.modules.all():
                lessons = list(module.lessons.all())
                if not lessons:
                    continue

                for lesson in lessons:
                    blurb = summary_of(lesson)
                    lesson.text_content = reading_for(lesson, course, blurb)
                    lesson.save(update_fields=['text_content'])
                    lessons_updated += 1

                # Ensure the module's first lesson carries a quiz.
                first = lessons[0]
                target_quizzes = list(Quiz.objects.filter(lesson__in=lessons))
                if not target_quizzes:
                    quiz = Quiz.objects.create(
                        lesson=first, title=f'Quiz: {first.title}'
                    )
                    target_quizzes = [quiz]

                # (Re)build questions for every quiz in this module so no
                # placeholder options ('Concept A', 'Option 1') survive.
                for quiz in target_quizzes:
                    lesson = quiz.lesson
                    self._build_questions(
                        quiz, lesson, module, course, levels,
                        summary_pool, module_titles,
                    )
                    quizzes_ready += 1

            self.stdout.write(f'  * {course.title}: enriched')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {lessons_updated} lessons expanded, '
            f'{quizzes_ready} quizzes with real questions.'
        ))

    def _build_questions(self, quiz, lesson, module, course, levels,
                         summary_pool, module_titles):
        quiz.questions.all().delete()

        correct_summary = summary_of(lesson)
        distractor_summaries = random.sample(
            [s for s in summary_pool if s and s != correct_summary]
            or ['A different, unrelated topic'],
            k=min(3, max(1, len(set(summary_pool)) - 1)),
        )
        q1_options = [correct_summary] + distractor_summaries
        q1_options = q1_options[:4]
        while len(q1_options) < 4:
            q1_options.append('None of the above')
        random.shuffle(q1_options)

        other_modules = [m for m in module_titles if m != module.title]
        q2_distractors = random.sample(other_modules, k=min(3, len(other_modules))) \
            if other_modules else ['Introduction', 'Advanced Topics', 'Conclusion']
        q2_options = [module.title] + q2_distractors[:3]
        q2_options = q2_options[:4]
        random.shuffle(q2_options)

        level_label = levels.get(course.level, 'Beginner')
        q3_options = list(levels.values())  # Beginner / Intermediate / Advanced
        if 'Expert' not in q3_options:
            q3_options.append('Expert')
        random.shuffle(q3_options)

        questions = [
            {
                'text': f'What is the main focus of the lesson "{lesson.title}"?',
                'options': q1_options,
                'correct': q1_options.index(correct_summary),
            },
            {
                'text': f'Which section of "{course.title}" does this lesson belong to?',
                'options': q2_options,
                'correct': q2_options.index(module.title),
            },
            {
                'text': f'What experience level is the course "{course.title}" aimed at?',
                'options': q3_options,
                'correct': q3_options.index(level_label),
            },
        ]
        for order, q in enumerate(questions, start=1):
            QuizQuestion.objects.create(
                quiz=quiz,
                text=q['text'],
                options=q['options'],
                correct_answer=q['correct'],
                order=order,
            )
