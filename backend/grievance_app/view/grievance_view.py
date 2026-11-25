from flask import Response, jsonify

from shared.serializers import grievance_to_dict


def sniff_audio_mimetype(blob):
    """Best-effort content type for stored recordings (no mime column in the DB)."""
    head = bytes(blob[:12])
    if head.startswith(b"\x1a\x45\xdf\xa3"):
        return "audio/webm"
    if head.startswith(b"RIFF") and head[8:12] == b"WAVE":
        return "audio/wav"
    if head.startswith(b"OggS"):
        return "audio/ogg"
    if head.startswith(b"ID3") or head[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "audio/mpeg"
    if head[4:8] == b"ftyp":
        return "audio/mp4"
    return "application/octet-stream"


class GrievanceView:
    @staticmethod
    def render_created(grievance, assigned_by):
        data = grievance_to_dict(grievance)
        data["assigned_by"] = assigned_by
        return jsonify(data)

    @staticmethod
    def render_grievances(grievances):
        return jsonify([grievance_to_dict(g) for g in grievances])

    @staticmethod
    def render_text(text):
        return jsonify({"text": text})

    @staticmethod
    def render_audio(blob):
        mimetype = sniff_audio_mimetype(blob)
        extension = {"audio/webm": "webm", "audio/wav": "wav", "audio/ogg": "ogg",
                     "audio/mpeg": "mp3", "audio/mp4": "m4a"}.get(mimetype, "bin")
        return Response(
            bytes(blob),
            mimetype=mimetype,
            headers={"Content-Disposition": f"inline; filename=grievance-audio.{extension}"},
        )
