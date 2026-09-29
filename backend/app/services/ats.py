"""Analisis de compatibilidad CV <-> puesto, al estilo de un ATS.

Estrategia (similar a la que usan herramientas como Jobscan): se extraen las
palabras y frases clave mas relevantes de la descripcion del puesto y se
comprueba cuantas de ellas aparecen tambien en el CV. El porcentaje de
compatibilidad es la proporcion (ponderada) de esas palabras clave que el CV
cubre. No se hace ninguna llamada externa: todo es texto plano procesado en
el propio backend.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from dataclasses import dataclass

# Palabras vacias (stopwords) en espanol e ingles: conectores, articulos,
# pronombres, verbos auxiliares... no aportan senal sobre el contenido.
_STOPWORDS = {
    # Espanol
    "a", "al", "algo", "algunas", "algunos", "ante", "antes", "como", "con",
    "contra", "cual", "cuando", "de", "del", "desde", "donde", "durante",
    "e", "el", "ella", "ellas", "ellos", "en", "entre", "era", "erais",
    "eran", "eres", "es", "esa", "esas", "ese", "eso", "esos", "esta",
    "estaba", "estado", "estamos", "estan", "estar", "este", "esto",
    "estos", "fin", "fue", "fueron", "fui", "fuimos", "ha", "hace",
    "hacen", "hacer", "hacia", "han", "hasta", "hay", "he", "la", "las",
    "le", "les", "lo", "los", "mas", "me", "mi", "mientras", "muy",
    "nada", "ni", "no", "nos", "nosotros", "nuestra", "nuestras",
    "nuestro", "nuestros", "o", "os", "otra", "otras", "otro", "otros",
    "para", "pero", "poco", "por", "porque", "que", "quien", "se", "sea",
    "segun", "ser", "si", "sido", "siendo", "sin", "sobre", "solo", "somos",
    "son", "soy", "su", "sus", "tambien", "tanto", "te", "tener", "tiene",
    "tienen", "todo", "todos", "tu", "tus", "un", "una", "uno", "unos",
    "usted", "ustedes", "vosotros", "y", "ya", "yo",
    # Ingles
    "a", "about", "after", "again", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below",
    "between", "both", "but", "by", "can", "did", "do", "does", "doing",
    "down", "during", "each", "few", "for", "from", "further", "had",
    "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its",
    "itself", "just", "me", "more", "most", "my", "myself", "no", "nor",
    "not", "now", "of", "off", "on", "once", "only", "or", "other", "our",
    "ours", "ourselves", "out", "over", "own", "same", "she", "should",
    "so", "some", "such", "than", "that", "the", "their", "theirs",
    "them", "themselves", "then", "there", "these", "they", "this",
    "those", "through", "to", "too", "under", "until", "up", "very",
    "was", "we", "were", "what", "when", "where", "which", "while", "who",
    "whom", "why", "will", "with", "you", "your", "yours", "yourself",
    "yourselves",
    # Ruido tipico de ofertas de empleo que no aporta senal de skills
    "empresa", "equipo", "trabajo", "puesto", "experiencia", "anos",
    "ano", "años", "año", "years", "year", "company", "team", "role",
    "job", "work", "ofrecemos", "buscamos", "requisitos", "responsable",
    "responsabilidades", "funciones", "requirements", "responsibilities",
    "conocimiento", "conocimientos", "control", "valora", "valorable",
    "nivel", "intermedio", "avanzado", "basico", "basicos", "importante",
    "deseable", "imprescindible", "minimo", "ademas", "asi", "usando",
    "utilizando", "manejo", "capacidad", "excelente", "buena", "buenas",
    "solida", "solidos", "fuerte", "fuertes", "skills", "knowledge",
    "strong", "good", "basic", "advanced", "preferred", "plus", "using",
    "developer", "desarrollador", "desarrolladora",
}

# Tokens cortos (<3 caracteres) que se conservan porque son siglas/tecnologias
# reales, aunque la regla general descarte tokens tan cortos por ser ruido.
_SHORT_TOKEN_WHITELIST = {
    "ai", "ia", "ux", "ui", "qa", "ci", "cd", "js", "ts", "db", "os",
    "ml", "bi", "r", "c", "go", "aws", "gcp", "sql", "api", "css",
    "php", "css3", "html",
}

_TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+#]*(?:\.[a-z0-9+#]+)*")

# Peso extra para bigramas (frases de dos palabras): son mas especificas que
# una palabra suelta, asi que cuentan mas al calcular el porcentaje.
_BIGRAM_WEIGHT = 1.5
_UNIGRAM_WEIGHT = 1.0

# Cuantas palabras clave (como maximo) se extraen de la descripcion del puesto.
_MAX_KEYWORDS = 40
# Cuantas se devuelven en cada lista (coincidencias / faltantes) para el UI.
_MAX_KEYWORDS_IN_RESPONSE = 25


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _tokenize(text: str) -> list[str]:
    normalized = _strip_accents(text.lower())
    return _TOKEN_RE.findall(normalized)


def _is_meaningful(token: str) -> bool:
    if token in _STOPWORDS:
        return False
    if token.isdigit():
        return False
    if len(token) < 3 and token not in _SHORT_TOKEN_WHITELIST:
        return False
    return True


@dataclass
class Keyword:
    term: str
    weight: float


def _extract_keywords(tokens: list[str]) -> list[Keyword]:
    """Extrae unigramas y bigramas relevantes de una lista de tokens, con su peso."""
    unigram_counts = Counter(t for t in tokens if _is_meaningful(t))

    # Los bigramas solo se forman entre palabras REALMENTE seguidas en el
    # texto original (no tras quitar las stopwords de en medio), para no
    # juntar palabras de frases distintas como si fueran una frase clave.
    bigram_counts: Counter[str] = Counter()
    for prev, curr in zip(tokens, tokens[1:]):
        if _is_meaningful(prev) and _is_meaningful(curr):
            bigram_counts[f"{prev} {curr}"] += 1

    candidates: dict[str, float] = {}
    for term, count in unigram_counts.items():
        candidates[term] = count * _UNIGRAM_WEIGHT
    for term, count in bigram_counts.items():
        candidates[term] = count * _BIGRAM_WEIGHT

    ranked = sorted(candidates.items(), key=lambda item: item[1], reverse=True)
    return [Keyword(term=term, weight=weight) for term, weight in ranked[:_MAX_KEYWORDS]]


def _keyword_present(keyword: str, cv_unigrams: set[str], cv_bigrams: set[str]) -> bool:
    words = keyword.split(" ")
    if len(words) == 1:
        return keyword in cv_unigrams
    # Bigrama: cuenta como presente si aparece literalmente en el CV, o si
    # ambas palabras aparecen en el CV (aunque no vayan seguidas).
    return keyword in cv_bigrams or all(w in cv_unigrams for w in words)


def _level_for_score(score: int) -> str:
    if score >= 75:
        return "alto"
    if score >= 50:
        return "medio"
    return "bajo"


def analyze_match(cv_text: str, job_description: str) -> dict:
    jd_tokens = _tokenize(job_description)
    cv_tokens = _tokenize(cv_text)

    keywords = _extract_keywords(jd_tokens)

    cv_unigrams = {t for t in cv_tokens if _is_meaningful(t)}
    cv_bigrams = {
        f"{a} {b}"
        for a, b in zip(cv_tokens, cv_tokens[1:])
        if _is_meaningful(a) and _is_meaningful(b)
    }

    matched: list[Keyword] = []
    missing: list[Keyword] = []
    for kw in keywords:
        if _keyword_present(kw.term, cv_unigrams, cv_bigrams):
            matched.append(kw)
        else:
            missing.append(kw)

    total_weight = sum(kw.weight for kw in keywords)
    matched_weight = sum(kw.weight for kw in matched)
    score = round((matched_weight / total_weight) * 100) if total_weight > 0 else 0
    score = max(0, min(100, score))

    matched.sort(key=lambda kw: kw.weight, reverse=True)
    missing.sort(key=lambda kw: kw.weight, reverse=True)

    return {
        "score": score,
        "level": _level_for_score(score),
        "total_keywords": len(keywords),
        "matched_count": len(matched),
        "matched_keywords": [
            {"term": kw.term, "weight": kw.weight}
            for kw in matched[:_MAX_KEYWORDS_IN_RESPONSE]
        ],
        "missing_keywords": [
            {"term": kw.term, "weight": kw.weight}
            for kw in missing[:_MAX_KEYWORDS_IN_RESPONSE]
        ],
    }
