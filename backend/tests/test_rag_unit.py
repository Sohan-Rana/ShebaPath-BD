from app.ai.embeddings import hash_embedding
from app.ai.ingest import chunk_text, clean_text
from app.ai.rag import detect_language


def test_detect_language():
    assert detect_language("পাসপোর্টের ফি কত?") == "bn"
    assert detect_language("passport fee") == "en"


def test_chunking_respects_size_and_keeps_text():
    text = "\n\n".join(f"Paragraph {i}. " + "word " * 40 for i in range(10))
    chunks = chunk_text(text, max_chars=400, overlap=50)
    assert len(chunks) > 1
    assert all(len(c) <= 400 * 1.5 for c in chunks)
    assert "Paragraph 0" in chunks[0] and "Paragraph 9" in chunks[-1]


def test_clean_text_strips_html():
    assert clean_text("<p>Hello   <b>world</b></p>") == "Hello world"


def test_hash_embedding_is_deterministic_and_normalised():
    a, b = hash_embedding("passport fee"), hash_embedding("passport fee")
    assert a == b and abs(sum(x * x for x in a) - 1.0) < 1e-6
    assert len(a) == 1536
