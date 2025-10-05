from flask import render_template, request, redirect, url_for, flash
from cityScience import app
from datetime import datetime
from cityScience.forms import BulletinForm, BulletinBuildForm
from cityScience.green import gerar_boletim_html, gerar_boletim_html_build

def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Simulação de notícias
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
    return render_template("game.html")

@app.route("/insights")
def insights():
    return render_template("insights.html")

@app.route('/leed_check', methods=['POST'])
def leed_check():
    criterios = request.form.getlist("criterios")
    if criterios:
        flash(f"Critérios LEED selecionados: {', '.join(criterios)}", "success")
    else:
        flash("Nenhum critério LEED foi selecionado.", "warning")
    return redirect(url_for('insights'))

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
        print('Form data received:', city, prompt, obs)
            
        gerar_boletim_html(prompt, city, obs, output_filename="./cityScience/templates/bulletin.html")

        flash('Boletim gerado com sucesso!', 'success')
        return render_template('bulletin.html')

    return render_template('create_bulletin_urban.html', form=form)

@app.route('/create_bulletin_build', methods=['GET', 'POST'])
def create_bulletin_build():
    form = BulletinBuildForm()

    city_param = request.args.get("city")
    if city_param and not form.city.data:
        form.city.data = city_param 

    if form.validate_on_submit():
        city = form.city.data.strip()
        
        # Captura dos novos campos LEED/Sustentabilidade
        project_type = form.project_type.data.strip()
        leed_goal = form.leed_goal.data.strip()
        focus_area = form.focus_area.data.strip()
        project_details = form.project_details.data.strip()
        
        print('Form data received:', 
              city, project_type, leed_goal, focus_area, project_details)
            
        # Chamada da função de geração (ajustada para passar os novos parâmetros)
        gerar_boletim_html_build(
            project_details=project_details, # O texto principal do prompt
            city=city, 
            project_type=project_type,
            leed_goal=leed_goal,
            focus_area=focus_area,
            output_filename="./cityScience/templates/bulletin.html"
        )

        flash('Boletim gerado com sucesso!', 'success')
        return render_template('bulletin.html')

    # Passa o form para o template create_bulletin_build.html
    return render_template('create_bulletin_build.html', form=form)