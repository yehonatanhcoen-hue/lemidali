-- Placeholder demo content only (for testing the skeleton).
-- Safe to delete from the Manage page once the real course is added.

insert into public.courses (id, title, description) values
  ('00000000-0000-4000-8000-000000000001', 'My Learning Course', 'Placeholder course description.');

insert into public.topics (id, course_id, title, description, position) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Topic 1', 'Placeholder topic description.', 0),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'Topic 2', 'Placeholder topic description.', 1);

insert into public.lessons (id, topic_id, title, description, position, duration_minutes, learning_url) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Lesson 1', 'Placeholder lesson description.', 0, 60, 'https://example.com'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'Lesson 2', 'Placeholder lesson description.', 1, 60, null),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102', 'Lesson 3', 'Placeholder lesson description.', 0, 60, null);

insert into public.quiz_questions (id, lesson_id, question, position) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', 'Placeholder question 1?', 0),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000201', 'Placeholder question 2?', 1);

insert into public.quiz_answers (question_id, answer, is_correct, position) values
  ('00000000-0000-4000-8000-000000000301', 'Answer A', true,  0),
  ('00000000-0000-4000-8000-000000000301', 'Answer B', false, 1),
  ('00000000-0000-4000-8000-000000000301', 'Answer C', false, 2),
  ('00000000-0000-4000-8000-000000000301', 'Answer D', false, 3),
  ('00000000-0000-4000-8000-000000000302', 'Answer A', false, 0),
  ('00000000-0000-4000-8000-000000000302', 'Answer B', false, 1),
  ('00000000-0000-4000-8000-000000000302', 'Answer C', true,  2),
  ('00000000-0000-4000-8000-000000000302', 'Answer D', false, 3);
