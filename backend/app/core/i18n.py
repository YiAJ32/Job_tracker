import re

# Los mensajes se escriben en español en el código; acá están sus traducciones.
# El frontend manda el idioma elegido en el encabezado Accept-Language.
SUPPORTED_LANGUAGES = ("es", "en", "pt")
DEFAULT_LANGUAGE = "es"

MESSAGES = {
    "Solicitud no encontrada": {
        "en": "Application not found",
        "pt": "Candidatura não encontrada",
    },
    "Solo se permiten archivos PDF o Word (.pdf, .doc, .docx)": {
        "en": "Only PDF or Word files are allowed (.pdf, .doc, .docx)",
        "pt": "Apenas arquivos PDF ou Word são permitidos (.pdf, .doc, .docx)",
    },
    "Esta solicitud no tiene CV cargado": {
        "en": "This application has no CV uploaded",
        "pt": "Esta candidatura não tem CV enviado",
    },
    "El archivo del CV no se encontró": {
        "en": "The CV file was not found",
        "pt": "O arquivo do CV não foi encontrado",
    },
    "Ya existe una cuenta con ese email": {
        "en": "An account with that email already exists",
        "pt": "Já existe uma conta com esse email",
    },
    "Email o contraseña incorrectos": {
        "en": "Incorrect email or password",
        "pt": "Email ou senha incorretos",
    },
    "Empresa no encontrada": {
        "en": "Company not found",
        "pt": "Empresa não encontrada",
    },
    "No dejaste una reseña para esta empresa": {
        "en": "You haven't reviewed this company",
        "pt": "Você não avaliou esta empresa",
    },
    "El CV está vacío": {
        "en": "The CV is empty",
        "pt": "O CV está vazio",
    },
    "La descripción del puesto está vacía": {
        "en": "The job description is empty",
        "pt": "A descrição da vaga está vazia",
    },
    "El nombre no puede estar vacío": {
        "en": "The name can't be empty",
        "pt": "O nome não pode ficar vazio",
    },
    "La foto tiene que ser una imagen JPG, PNG o WEBP": {
        "en": "The photo must be a JPG, PNG or WEBP image",
        "pt": "A foto precisa ser uma imagem JPG, PNG ou WEBP",
    },
    "La foto no puede pesar más de 2 MB": {
        "en": "The photo can't be larger than 2 MB",
        "pt": "A foto não pode ter mais de 2 MB",
    },
    "Este usuario no tiene foto": {
        "en": "This user has no photo",
        "pt": "Este usuário não tem foto",
    },
    "El archivo de la foto no se encontró": {
        "en": "The photo file was not found",
        "pt": "O arquivo da foto não foi encontrado",
    },
    "Tenés que iniciar sesión": {
        "en": "You need to log in",
        "pt": "Você precisa entrar na conta",
    },
    "Sesión inválida o vencida": {
        "en": "Invalid or expired session",
        "pt": "Sessão inválida ou expirada",
    },
}

# Mensajes que incluyen un dato variable
PATTERNS = [
    (
        re.compile(r"^La empresa (?P<name>.+) ya existe$"),
        {"en": "The company {name} already exists", "pt": "A empresa {name} já existe"},
    ),
    (
        re.compile(r"^estado_id (?P<id>.+) no existe$"),
        {"en": "estado_id {id} doesn't exist", "pt": "estado_id {id} não existe"},
    ),
]


def preferred_language(accept_language: str | None) -> str:
    for part in (accept_language or "").split(","):
        code = part.split(";")[0].strip()[:2].lower()
        if code in SUPPORTED_LANGUAGES:
            return code
    return DEFAULT_LANGUAGE


def translate_message(message: str, language: str) -> str:
    if language == DEFAULT_LANGUAGE:
        return message
    translations = MESSAGES.get(message)
    if translations:
        return translations.get(language, message)
    for pattern, templates in PATTERNS:
        match = pattern.match(message)
        if match and language in templates:
            return templates[language].format(**match.groupdict())
    return message
