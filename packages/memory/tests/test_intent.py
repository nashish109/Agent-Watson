"""Unit tests for the IntentClassifier."""

from memory.intent import IntentType, classify


class TestQuestionDetection:
    def test_what_question(self):
        r = classify("What do you remember?")
        assert r.intent == IntentType.QUESTION

    def test_who_question(self):
        r = classify("Who are you?")
        assert r.intent == IntentType.QUESTION

    def test_how_question(self):
        r = classify("How are you?")
        assert r.intent == IntentType.QUESTION

    def test_tell_me_about(self):
        r = classify("Tell me about yourself.")
        assert r.intent == IntentType.QUESTION

    def test_can_you_help(self):
        r = classify("Can you help me?")
        assert r.intent == IntentType.QUESTION

    def test_question_without_mark(self):
        r = classify("Tell me about yourself")
        assert r.intent == IntentType.QUESTION

    def test_question_confidence(self):
        r = classify("Who created you?")
        assert r.confidence == 0.9


class TestLearningIntent:
    def test_learned(self):
        r = classify("Today I learned Kafka.")
        assert r.intent == IntentType.LEARNING

    def test_studied(self):
        r = classify("Studied probability.")
        assert r.intent == IntentType.LEARNING

    def test_chapter(self):
        r = classify("Learning from chapter 3.")
        assert r.intent == IntentType.LEARNING

    def test_course(self):
        r = classify("Finished the Rust course.")
        assert r.intent == IntentType.LEARNING

    def test_learning_confidence(self):
        r = classify("I learned something new.")
        assert r.confidence == 0.7


class TestProjectIntent:
    def test_built(self):
        r = classify("Built Watson.")
        assert r.intent == IntentType.PROJECT

    def test_finished(self):
        r = classify("Finished the backend.")
        assert r.intent == IntentType.PROJECT

    def test_implemented(self):
        r = classify("Implemented login.")
        assert r.intent == IntentType.PROJECT

    def test_deployed(self):
        r = classify("Deployed the API.")
        assert r.intent == IntentType.PROJECT


class TestCareerIntent:
    def test_interview(self):
        r = classify("Interview today.")
        assert r.intent == IntentType.CAREER

    def test_working_at(self):
        r = classify("Worked at DTCC.")
        assert r.intent == IntentType.CAREER

    def test_onboarding(self):
        r = classify("Completed onboarding.")
        assert r.intent == IntentType.CAREER

    def test_career_confidence(self):
        r = classify("Had an interview.")
        assert r.confidence == 0.75


class TestHealthIntent:
    def test_gym(self):
        r = classify("Went to the gym.")
        assert r.intent == IntentType.HEALTH

    def test_ran(self):
        r = classify("Ran 5 km.")
        assert r.intent == IntentType.HEALTH

    def test_yoga(self):
        r = classify("Did yoga today.")
        assert r.intent == IntentType.HEALTH

    def test_meditation(self):
        r = classify("Meditated for 10 minutes.")
        assert r.intent == IntentType.HEALTH


class TestReflectionIntent:
    def test_felt(self):
        r = classify("I felt stressed today.")
        assert r.intent == IntentType.REFLECTION

    def test_proud(self):
        r = classify("I was proud today.")
        assert r.intent == IntentType.REFLECTION

    def test_struggled(self):
        r = classify("I struggled to focus.")
        assert r.intent == IntentType.REFLECTION

    def test_grateful(self):
        r = classify("Feeling grateful for today.")
        assert r.intent == IntentType.REFLECTION

    def test_reflection_confidence(self):
        r = classify("I felt happy.")
        assert r.confidence == 0.75


class TestGenericIntent:
    def test_random_text(self):
        r = classify("Had a nice lunch with friends.")
        assert r.intent == IntentType.PERSONAL

    def test_empty_text(self):
        r = classify("")
        assert r.intent == IntentType.GENERIC

    def test_generic_confidence(self):
        r = classify("Just another day.")
        assert r.confidence == 0.4


class TestPriorityOrder:
    """Question detection should take priority over content keywords."""

    def test_question_beats_learning(self):
        r = classify("What did I learn yesterday?")
        assert r.intent == IntentType.QUESTION

    def test_question_beats_health(self):
        r = classify("How was my gym session?")
        assert r.intent == IntentType.QUESTION
