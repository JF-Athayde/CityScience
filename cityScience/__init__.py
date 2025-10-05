from flask import Flask, render_template, jsonify
import random

app = Flask(__name__)
app.secret_key = random.randbytes(24)