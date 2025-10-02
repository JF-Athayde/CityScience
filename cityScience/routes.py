from flask import render_template
from cityScience import app
from datetime import datetime

def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Simulação de notícias (futuramente pode vir de banco de dados ou API)
NEWS = [
    {
        "id": "new01",
        "title": "Nome da notícia Principal",
        "subtitle": "City Science",
        "image": "https://www.nasa.gov/wp-content/uploads/2025/09/jsc2025e070711large.jpg?resize=900,600"
    },
    {
        "id": "new02",
        "title": "Nome da notícia Secundária",
        "subtitle": "City Science",
        "image": "https://www.nasa.gov/wp-content/uploads/2023/09/53206112789-e5e932c583-o.jpg?resize=300,200"
    },
    {
        "id": "new03",
        "title": "Nome da notícia Terciária 1",
        "subtitle": "City Science",
        "image": "https://www.nasa.gov/wp-content/uploads/2023/09/54297311670-165b523df3-o.jpg"
    },
    {
        "id": "new04",
        "title": "Nome da notícia Terciária 2",
        "subtitle": "City Science",
        "image": "https://www.nasa.gov/wp-content/uploads/2025/09/roscosmos-progress-92-cargo-craft.jpg?resize=400,225"
    }
]

@app.route("/")
def landingpage():
    return render_template("landingpage.html", news=NEWS)

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/about-us")
def about_us():
    return render_template("about-us.html")

@app.route("/eco-explorer")
def eco_explorer():
    data_atual = now()
    return render_template("eco-explorer.html", current_time=data_atual)

@app.route("/map")
def map_page():
    return render_template("map.html")

@app.route("/game")
def game():
    return render_template('game.html')