
import os

import firebase_admin
from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

if not firebase_admin._apps:
    firebase_admin.initialize_app()

db = firestore.client()
scores_ref = db.collection("scores")


@app.route("/")
def home():
    return jsonify({"message": "Cloud Clicker API is running!"})


@app.route("/leaderboard", methods=["GET"])
def leaderboard():
    duration = request.args.get("duration", default=10, type=int)

    if duration < 1 or duration > 300:
        return jsonify({"error": "Duration must be between 1 and 300 seconds"}), 400

    docs = scores_ref.where("duration", "==", duration).stream()

    scores = [
        {
            "username": doc.to_dict().get("username", ""),
            "score": doc.to_dict().get("score", 0),
            "duration": doc.to_dict().get("duration", 10)
        }
        for doc in docs
    ]

    scores.sort(key=lambda entry: entry["score"], reverse=True)

    return jsonify(scores[:10])


@app.route("/score", methods=["POST"])
def submit_score():
    data = request.get_json(silent=True) or {}

    username = str(data.get("username", "")).strip()
    score = data.get("score")
    duration = data.get("duration")

    if not username or len(username) > 20:
        return jsonify({"error": "Username must be 1–20 characters"}), 400

    if type(score) is not int or not 0 <= score <= 10000:
        return jsonify({"error": "Score must be an integer between 0 and 10000"}), 400

    if type(duration) is not int or not 1 <= duration <= 300:
        return jsonify({"error": "Duration must be an integer between 1 and 300 seconds"}), 400

    entry = {
        "username": username,
        "score": score,
        "duration": duration
    }

    scores_ref.add(entry)

    return jsonify({
        "message": "Score submitted successfully!",
        "score": entry
    }), 201


if __name__ == "__main__":
    app.run(debug=True)
    