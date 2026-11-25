"""Speech-to-text, translation and committee classification.

* Speech-to-text uses Google's free Web Speech API via ``SpeechRecognition``.
* Non-English text is translated to English with Google Gemini when
  ``GEMINI_API_KEY`` is set (optional).
* Classification uses the ``facebook/bart-large-mnli`` zero-shot model when
  ``transformers``/``torch`` are installed (``requirements-ml.txt``) and
  ``ENABLE_ML_CLASSIFIER`` is true. Otherwise - or if the model cannot be
  loaded - a keyword classifier is used, so submitting always works.
"""
import logging
import os
import re
import threading

import requests

from config import config
from shared.constants import COMMITTEES, DEFAULT_COMMITTEE

os.environ.setdefault('TF_ENABLE_ONEDNN_OPTS', '0')
logger = logging.getLogger(__name__)

LABELS = list(COMMITTEES.values())

# Keywords (English plus common Hindi terms) used by the fallback classifier.
KEYWORDS = {
    "examination": [
        "exam", "examination", "test", "marks", "grade", "result", "paper", "hall ticket",
        "admit card", "revaluation", "re-evaluation", "timetable", "time table", "invigilator",
        "question paper", "semester exam", "backlog", "परीक्षा", "अंक", "परिणाम",
    ],
    "infrastructure": [
        "classroom", "building", "chair", "bench", "fan", "light", "electric", "wifi", "wi-fi",
        "internet", "projector", "toilet", "washroom", "water", "leak", "roof", "repair",
        "broken", "ventilation", "air conditioner", "lift", "parking", "road", "कक्षा",
        "कुर्सी", "पंखे", "पंखा", "बिजली", "शौचालय",
    ],
    "general facility": [
        "canteen", "food", "mess", "hostel", "hygiene", "clean", "dirty", "transport", "bus",
        "security", "sports", "gym", "medical", "drinking water", "staff behaviour", "ragging",
        "कैंटीन", "खाना", "छात्रावास", "स्वच्छता",
    ],
    "research facility": [
        "research", "lab", "laboratory", "equipment", "instrument", "project", "experiment",
        "thesis", "phd", "supervisor", "guide", "chemical", "software license", "computing",
        "प्रयोगशाला", "उपकरण", "रिसर्च", "शोध",
    ],
    "journals/literature": [
        "library", "journal", "book", "textbook", "subscription", "ieee", "springer",
        "elsevier", "literature", "edition", "e-resource", "database access", "पुस्तकालय",
        "जर्नल", "पुस्तक", "पाठ्यपुस्तक",
    ],
    "fellowship": [
        "fellowship", "scholarship", "stipend", "financial aid", "disbursement", "grant",
        "fee", "fees", "refund", "payment", "छात्रवृत्ति", "फेलोशिप", "राशि",
    ],
}


class MLmodelsClass:
    _classifier = None
    _classifier_unavailable = False
    _lock = threading.Lock()

    # ------------------------------------------------------------------ speech
    @staticmethod
    def speechTotext(audio_buffer, lan):
        try:
            import speech_recognition as sr
        except ImportError:
            return {"success": False, "text": "", "error": "Speech recognition is not installed on the server."}

        try:
            recognizer = sr.Recognizer()
            with sr.AudioFile(audio_buffer) as source:
                audio_data = recognizer.record(source)
            try:
                text = recognizer.recognize_google(audio_data, language=lan)
                return {"success": True, "text": text, "error": None}
            except sr.UnknownValueError:
                return {"success": False, "text": "", "error": "Could not understand the audio. Please speak clearly and try again."}
            except sr.RequestError as e:
                return {"success": False, "text": "", "error": f"Speech service unavailable: {e}"}
        except Exception as e:  # malformed / unsupported audio
            logger.warning("Failed to process audio: %s", e)
            return {"success": False, "text": "", "error": "Could not read the recording. Please try again."}

    # ------------------------------------------------------------- translation
    @staticmethod
    def language_translator(text):
        """Translate text to English with Gemini. Returns (ok, text_or_error)."""
        if not config.GEMINI_API_KEY:
            return False, "GEMINI_API_KEY is not configured"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{config.GEMINI_MODEL}:generateContent"
        prompt = (
            "Translate the following text into English. "
            "Reply with only the English translation, nothing else.\n\n" + text
        )
        try:
            response = requests.post(
                url,
                headers={"x-goog-api-key": config.GEMINI_API_KEY, "Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            translated = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            return (True, translated) if translated else (False, "Empty translation")
        except Exception as error:
            logger.warning("Gemini translation failed: %s", error)
            return False, str(error)

    # ---------------------------------------------------------- classification
    @classmethod
    def _get_classifier(cls):
        if not config.ENABLE_ML_CLASSIFIER or cls._classifier_unavailable:
            return None
        if cls._classifier is not None:
            return cls._classifier
        with cls._lock:
            if cls._classifier is None and not cls._classifier_unavailable:
                try:
                    from transformers import pipeline

                    logger.info("Loading facebook/bart-large-mnli (first run downloads ~1.6 GB)...")
                    cls._classifier = pipeline(
                        "zero-shot-classification",
                        model="facebook/bart-large-mnli",
                        framework="pt",
                    )
                except Exception as error:
                    logger.warning("Zero-shot model unavailable, using keyword classifier: %s", error)
                    cls._classifier_unavailable = True
        return cls._classifier

    @staticmethod
    def keyword_classification(text):
        lowered = f" {text.lower()} "
        scores = {label: 0 for label in LABELS}
        for label, words in KEYWORDS.items():
            for word in words:
                if re.search(r"[a-z]", word):
                    pattern = r"\b" + re.escape(word) + r"(?:s|es|ed|ing)?\b"
                    scores[label] += len(re.findall(pattern, lowered))
                else:  # non-Latin scripts: plain substring match
                    scores[label] += lowered.count(word)
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else DEFAULT_COMMITTEE

    @classmethod
    def grievance_classification(cls, grie_desc, language="english"):
        """Return (committee_label, method) where method is "ai" or "keywords"."""
        text = grie_desc or ""
        if language and language.lower() != "english":
            ok, translated = cls.language_translator(text)
            if ok:
                text = translated

        classifier = cls._get_classifier()
        if classifier is not None:
            try:
                result = classifier(
                    text,
                    candidate_labels=LABELS,
                    hypothesis_template="This grievance is about {}.",
                )
                return result["labels"][0], "ai"
            except Exception as error:
                logger.warning("Zero-shot classification failed, using keywords: %s", error)

        return cls.keyword_classification(text), "keywords"
