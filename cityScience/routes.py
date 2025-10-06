from flask import render_template, request, redirect, url_for, flash, jsonify
from cityScience import app
from datetime import datetime
from cityScience.forms import BulletinForm, BulletinBuildForm, BulletinPolicyForm, InsightForm
from cityScience.green import gerar_boletim_html, gerar_boletim_html_build, gerar_boletim_html_management
import requests
import random
import os

API_KEY = '0c08db66c2f348e69c9143232250806'

def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# -------------------- ROTAS BÁSICAS --------------------

@app.route("/")
def landingpage():
    return render_template("landingpage.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/about-us")
def about_us():
    return render_template("about-us.html")

@app.route("/map")
def map_page():
    return render_template("map.html")

@app.route("/game")
def game():
    return render_template("game.html")

@app.route("/insights", methods=["GET", "POST"])
def insights():
    form = InsightForm()
    weather_data = {}  # agora vamos enviar dicionário estruturado

    if form.validate_on_submit():
        city = form.city.data.strip()
        api_key = "0c08db66c2f348e69c9143232250806"
        url = f"http://api.weatherapi.com/v1/forecast.json?key={api_key}&q={city}&days=3&aqi=no&alerts=no"

        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()

            location = data.get("location", {})
            current = data.get("current", {})
            forecast_days = data.get("forecast", {}).get("forecastday", [])

            # dados básicos
            weather_data['location'] = {
                "name": location.get("name", city),
                "region": location.get("region", ""),
                "country": location.get("country", ""),
                "last_updated": current.get("last_updated")
            }

            weather_data['current'] = {
                "condition": current.get("condition", {}).get("text", ""),
                "temp_c": current.get("temp_c"),
                "feelslike_c": current.get("feelslike_c"),
                "humidity": current.get("humidity"),
                "wind_kph": current.get("wind_kph"),
                "wind_dir": current.get("wind_dir"),
                "gust_kph": current.get("gust_kph"),
                "cloud": current.get("cloud"),
                "pressure_mb": current.get("pressure_mb"),
                "vis_km": current.get("vis_km"),
                "uv": current.get("uv"),
                "precip_mm": current.get("precip_mm")
            }

            # previsão
            weather_data['forecast'] = []
            for day in forecast_days:
                day_info = day.get("day", {})
                astro_info = day.get("astro", {})
                weather_data['forecast'].append({
                    "date": day.get("date"),
                    "condition": day_info.get("condition", {}).get("text", ""),
                    "maxtemp": day_info.get("maxtemp_c"),
                    "mintemp": day_info.get("mintemp_c"),
                    "avgtemp": day_info.get("avgtemp_c"),
                    "chance_of_rain": day_info.get("daily_chance_of_rain"),
                    "chance_of_snow": day_info.get("daily_chance_of_snow"),
                    "maxwind": day_info.get("maxwind_kph"),
                    "totalprecip": day_info.get("totalprecip_mm"),
                    "avghumidity": day_info.get("avghumidity"),
                    "sunrise": astro_info.get("sunrise"),
                    "sunset": astro_info.get("sunset"),
                    "moonrise": astro_info.get("moonrise"),
                    "moonset": astro_info.get("moonset")
                })

        except requests.exceptions.RequestException as e:
            print("Exceção capturada:", e)
            weather_data['error'] = f"Network error: {e}"

    return render_template("insights.html", form=form, weather_data=weather_data)

@app.route("/nerd")
def nerd():
    return render_template("nerd.html")

@app.route('/leed_check', methods=['POST'])
def leed_check():
    criterios = request.form.getlist("criterios")
    if criterios:
        flash(f"Critérios LEED selecionados: {', '.join(criterios)}", "success")
    else:
        flash("Nenhum critério LEED foi selecionado.", "warning")
    return redirect(url_for('insights'))

# -------------------- BOLETINS --------------------

EXAMPLES_PATH = "./cityScience/templates/examples"

# garante que a pasta exista
os.makedirs(EXAMPLES_PATH, exist_ok=True)

@app.route('/create_bulletin_urban', methods=['GET', 'POST'])
def create_bulletin_urban():
    form = BulletinForm()

    city_param = request.args.get("city")
    if city_param and not form.city.data:
        form.city.data = city_param 

    if form.validate_on_submit():
        city = form.city.data.strip()
        prompt = form.prompt.data.strip()
        obs = form.obs.data.strip()
        
        # gera nome único
        filename = f"bulletin_{random.randint(1, 1000000)}.html"
        path = os.path.join(EXAMPLES_PATH, filename)

        print('Form data received:', city, prompt, obs)

        # gera boletim e salva
        gerar_boletim_html(prompt, city, obs, output_filename=path)

        flash('Boletim gerado com sucesso!', 'success')
        return render_template(f"examples/{filename}")

    return render_template('create_bulletin_urban.html', form=form)


@app.route('/create_bulletin_build', methods=['GET', 'POST'])
def create_bulletin_build():
    form = BulletinBuildForm()

    city_param = request.args.get("city")
    if city_param and not form.city.data:
        form.city.data = city_param 

    if form.validate_on_submit():
        city = form.city.data.strip()
        project_type = form.project_type.data.strip()
        leed_goal = form.leed_goal.data.strip()
        focus_area = form.focus_area.data.strip()
        project_details = form.project_details.data.strip()
        
        print('Form data received:', city, project_type, leed_goal, focus_area, project_details)
        
        filename = f"bulletin_{random.randint(1, 1000000)}.html"
        path = os.path.join(EXAMPLES_PATH, filename)

        gerar_boletim_html_build(
            project_details=project_details,
            city=city,
            project_type=project_type,
            leed_goal=leed_goal,
            focus_area=focus_area,
            output_filename=path
        )

        flash('Boletim gerado com sucesso!', 'success')
        return render_template(f"examples/{filename}")

    return render_template('create_bulletin_build.html', form=form)


@app.route('/create_bulletin_management', methods=['GET', 'POST'])
def create_bulletin_management():
    form = BulletinPolicyForm()

    city_param = request.args.get("city")
    if city_param and not form.city.data:
        form.city.data = city_param

    if form.validate_on_submit():
        city = form.city.data.strip()
        problem = form.problem.data.strip()
        goal = form.goal.data.strip()
        budget = form.budget.data
        timeframe = form.timeframe.data.strip()
        priority = form.priority.data.strip()
        expected_impact = form.expected_impact.data.strip()

        filename = f"bulletin_{random.randint(1, 1000000)}.html"
        path = os.path.join(EXAMPLES_PATH, filename)

        gerar_boletim_html_management(
            city=city,
            problem=problem,
            goal=goal,
            budget=budget,
            timeframe=timeframe,
            priority=priority,
            expected_impact=expected_impact,
            output_filename=path
        )

        flash('Boletim gerado com sucesso!', 'success')
        return render_template(f"examples/{filename}")

    return render_template('create_bulletin_management.html', form=form)

