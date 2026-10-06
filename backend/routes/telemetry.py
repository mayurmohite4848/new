from flask import Blueprint, jsonify, request
try:
    from backend.db import get_llm_telemetry_stats, get_llm_telemetry_recent, clear_llm_telemetry
except ImportError:
    from db import get_llm_telemetry_stats, get_llm_telemetry_recent, clear_llm_telemetry

telemetry_bp = Blueprint('telemetry', __name__)

@telemetry_bp.route('/api/telemetry/stats', methods=['GET'])
def get_telemetry_stats_endpoint():
    """Retrieves high-level aggregate LLMOps metrics for the telemetry dashboard."""
    try:
        stats = get_llm_telemetry_stats()
        return jsonify({"success": True, "telemetry": stats}), 200
    except Exception as e:
        return jsonify({"error": str(e), "message": "Failed to calculate telemetry metrics."}), 500

@telemetry_bp.route('/api/telemetry/logs', methods=['GET'])
def get_telemetry_logs_endpoint():
    """Retrieves recent individual execution telemetry records with token and latency breakdowns."""
    try:
        limit = request.args.get('limit', default=50, type=int)
        logs = get_llm_telemetry_recent(limit=min(limit, 200))
        return jsonify({"success": True, "logs": logs, "count": len(logs)}), 200
    except Exception as e:
        return jsonify({"error": str(e), "message": "Failed to retrieve telemetry logs."}), 500

@telemetry_bp.route('/api/telemetry/logs', methods=['DELETE'])
def clear_telemetry_logs_endpoint():
    """Clears all historical telemetry records."""
    try:
        deleted = clear_llm_telemetry()
        return jsonify({"success": True, "message": f"Cleared {deleted} telemetry records."}), 200
    except Exception as e:
        return jsonify({"error": str(e), "message": "Failed to clear telemetry logs."}), 500
