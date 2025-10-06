import os
import requests
import google.generativeai as genai
import time
incio = time.time()

OUTPUT_HTML = "bulletin.html"
API_KEY_GEMINI = "AIzaSyBsUwzs2s0FhpvF-FOggpaeXmCBTKGNMyA"
genai.configure(api_key=API_KEY_GEMINI)

def get_info(city):
    api_key = "0c08db66c2f348e69c9143232250806"
    url = f"http://api.weatherapi.com/v1/forecast.json?key={api_key}&q={city}&days=3&aqi=no&alerts=no"
    response = requests.get(url).json()
    forecast_days = response['forecast']['forecastday']

    temperaturas, umidades, ventos, nuvens, uvs = [], [], [], [], []
    for day in forecast_days:
        day_data = day['day']
        temperaturas.append(day_data['avgtemp_c'])
        umidades.append(day_data['avghumidity'])
        ventos.append(day_data['maxwind_kph'])
        nuvens.append(day_data.get('cloud', None))
        uvs.append(day_data['uv'])

    last_day_hours = forecast_days[-1]['hour']
    for h in last_day_hours:
        if len(temperaturas) >= 14: break
        temperaturas.append(h['temp_c'])
        umidades.append(h['humidity'])
        ventos.append(h['wind_kph'])
        nuvens.append(h.get('cloud', None))
        uvs.append(h['uv'])

    return {
        'temperaturas': temperaturas,
        'umidades': umidades,
        'ventos': ventos,
        'nuvens': nuvens,
        'uvs': uvs
    }

def gerar_boletim_html(question: str, location: str, obs: str,output_filename: str = OUTPUT_HTML):
    dados_weather = get_info(location)
    
    prompt = f"""
    You are an environmental expert. Detect the language of the citizen's question and respond in the same language. 
    Write a clear and structured technical bulletin in bullet points about the following question:

    Question: {question}
    Location: {location}
    Observations: {obs}

    Base your analysis on the following data:
    - Average Temperatures: {dados_weather['temperaturas']}
    - Average Humidity: {dados_weather['umidades']}
    - Max Winds: {dados_weather['ventos']}
    - Average Clouds: {dados_weather['nuvens']}
    - UV Index: {dados_weather['uvs']}

    These datasets include both past records and future forecasts. 
    Treat them as time series and integrate their corresponding charts *within each topic*, not at the end of the document.

    Structure the answer in the following blocks:

    - *Context*
    * Describe the environmental background of the location.
    * Highlight any notable trends over time (e.g., rising temperatures, fluctuating humidity).
    * (Insert here the general overview chart comparing all variables through time.)

    - *Influencing Factors*
    * For each parameter below, write a short interpretation and include its chart immediately after the paragraph:
        - Temperature: describe how recent and forecasted trends affect the user's concern.
        - Humidity: describe implications of variations.
        - Wind: explain its environmental and practical effects.
        - Cloud Cover: relate to sunlight exposure or precipitation.
        - UV Index: relate to health, agriculture, or material effects.
    * Each chart should represent its own variable across past and forecasted days.

    - *Common Problems*
    * Based on the data patterns, list potential environmental risks or limitations typical of this region.
    * Mention which variable contributes most to each issue.

    - *Practical Solutions*
    * Suggest actions or preventive measures based on the user’s interest.
    * Relate recommendations to the upcoming forecast.

    - *Final Evaluation*
    * Provide a summary judgement of the region’s suitability for the user’s purpose.
    * Rate it as one of: “Highly Suitable”, “Moderately Suitable”, or “Unsuitable”.
    * Briefly justify using observed patterns.
    * Include a simple indicator or score (e.g., a bar, stars, or index value).

    Formatting Guidelines:
    - Each data-related section must contain its chart immediately after the text explanation (do NOT group charts at the end).
    - Use HTML tags for formatting: <b> for bold, <i> for italics, and inline CSS for colors when necessary.
    - Highlight environmental terms with <b> tags.
    - Use * for bullet points.
    - Always set the graph limits to 300 by 910.
    - Keep tone technical, concise, and visually structured.
    - All <canvas> elements must include explicit width="910" and height="300" attributes.
    - Also apply CSS style="width:910px;height:300px;" to each canvas to avoid scaling issues.

    Instructions:
    - Generate a full HTML page that is ready to open in a browser.
    - Include header, structured bullet points answering the question, and at least one chart.
    - Choose which data to visualize and the type of chart yourself.
    - Include all CSS and JS inline (Chart.js for charts).
    - The page must be complete and self-contained.
    - Return only HTML content, without any extra explanation.

    Follow this HTML structure strictly, the only part you should modify is the graphics part which must be exactly what was requested.
    
    The graphs must always have limits set to 300 by 910.
    
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Interactive Bulletin - {{location}}</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">

        <style>
        body {{
            font-family: 'Roboto', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f0f4f8;
            color: #333;
            line-height: 1.6;
        }}
        header {{
            background-color: #003366;
            color: #fff;
            padding: 30px 20px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}

        canvas {{
            width: 910px !important;
            height: 300px !important;
            max-width: 910px !important;
            max-height: 300px !important;
        }}

        h1 {{ font-weight: 700; margin-bottom: 5px; font-size: 2.2em; }}
        h2 {{
            font-weight: 500;
            font-size: 1.5em;
            color: #00A65A;
            border-bottom: 2px solid #00A65A;
            padding-bottom: 5px;
            margin-top: 30px;
            margin-bottom: 15px;
        }}
        p {{ margin-bottom: 10px; }}
        main {{ max-width: 1000px; margin: 20px auto; padding: 0 20px; }}
        section {{
            background-color: #fff;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }}
        section:first-of-type h2 {{ color: #333; border-bottom: 2px dashed #EEE; }}
        section:first-of-type p {{
            font-style: italic;
            font-size: 1.1em;
            color: #666;
            background-color: #f5f5dc;
            padding: 10px;
            border-left: 5px solid #00A65A;
            border-radius: 5px;
        }}
        strong {{ font-weight: 700; color: #003366; }}
        em {{ color: #00A65A; font-weight: 500; }}
        .custom-list {{ list-style: none; padding-left: 20px; margin-bottom: 15px; }}
        .custom-list li {{ position: relative; padding-left: 20px; margin-bottom: 8px; }}
        .custom-list li::before {{ content: '•'; position: absolute; left: 0; color: #00A65A; font-weight: 700; font-size: 1.2em; line-height: 1; }}
        footer {{ text-align: center; padding: 15px 0; margin-top: 30px; color: #999; font-size: 0.85em; border-top: 1px solid #ddd; }}
        </style>
    </head>
    <body>
        <header>
            <h1>Interactive Environmental Bulletin</h1>
            <h2>Location: {{location}}</h2>
        </header>
        <main>
            <section>
                <h2>Prompt:</h2>
                <p><em>{{question}}</em></p>
            </section>
            <section>
                <!-- A IA deve preencher esta seção com o texto do boletim -->
                {{texto_ia_html}}
            </section>
            <section>
                <h2>Graphs</h2>
                <p>
                    <!-- A IA deve decidir quais gráficos criar, quais dados usar e o tipo de gráfico -->
                </p>
            </section>
        </main>

        <footer>
            <button onclick="window.print()">Salvar página como PDF</button>
            <p>&copy; 2023 City Science. All rights reserved.</p>
        </footer>

        <script>
            alert('Click on Print and save your bulletin as a PDF. And dont refresh this page!');
            window.print()
        </script>
    </body>
    </html>
    """

    model = genai.GenerativeModel("models/gemini-2.5-flash")
    response = model.generate_content(prompt)
    
    html_content = response.text

    with open(output_filename, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✅ HTML page generated: {os.path.abspath(output_filename)}")

def gerar_boletim_html_build(
    project_details: str,
    city: str,
    project_type: str,
    leed_goal: str,
    focus_area: str,
    output_filename: str = OUTPUT_HTML
):
    dados_weather = get_info(city)

    prompt = f"""
    You are a certified LEED (Leadership in Energy and Environmental Design) consultant and sustainable architecture expert.
    The report and all generated content must be written **entirely in English**, regardless of the detected language of {project_details}.
    Write a complete HTML technical report integrating climate analysis and sustainable design guidance for the following project:

    Project Details:
    - Location: {city}
    - Type: {project_type}
    - LEED Goal: {leed_goal}
    - Focus Area: {focus_area}
    - Description: {project_details}

    Base your analysis on the following climate data:
    - Temperatures: {dados_weather['temperaturas']}
    - Humidity: {dados_weather['umidades']}
    - Winds: {dados_weather['ventos']}
    - Clouds: {dados_weather['nuvens']}
    - UV Index: {dados_weather['uvs']}

    These datasets represent past and forecasted trends. Treat them as time series and visualize them with inline charts.

    Structure the HTML document exactly as follows:

    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>GreenBuild Technical Report - {city}</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
            body {{
                font-family: 'Roboto', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f0f4f8;
                color: #333;
                line-height: 1.6;
            }}
            header {{
                background-color: #003366;
                color: #fff;
                padding: 30px 20px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            canvas {{
                width: 910px !important;
                height: 300px !important;
                max-width: 910px !important;
                max-height: 300px !important;
            }}
            h1 {{ font-weight: 700; margin-bottom: 5px; font-size: 2.2em; }}
            h2 {{
                font-weight: 500;
                font-size: 1.5em;
                color: #00A65A;
                border-bottom: 2px solid #00A65A;
                padding-bottom: 5px;
                margin-top: 30px;
                margin-bottom: 15px;
            }}
            p {{ margin-bottom: 10px; }}
            main {{ max-width: 1000px; margin: 20px auto; padding: 0 20px; }}
            section {{
                background-color: #fff;
                padding: 25px;
                margin-bottom: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            }}
            .custom-list {{ list-style: none; padding-left: 20px; }}
            .custom-list li::before {{ content: '•'; color: #00A65A; font-weight: bold; margin-right: 5px; }}
            footer {{
                text-align: center;
                padding: 15px 0;
                margin-top: 30px;
                color: #999;
                font-size: 0.85em;
                border-top: 1px solid #ddd;
            }}
        </style>
    </head>
    <body>
        <header>
            <h1>GreenBuild Technical Report (LEED)</h1>
            <h2>Location: {city}</h2>
        </header>
        <main>
            <section>
                <h2>Project Details</h2>
                <p><b>Type:</b> {project_type} | <b>LEED Goal:</b> {leed_goal} | <b>Focus Area:</b> {focus_area}</p>
                <p><i>{project_details}</i></p>
            </section>

            <section>
                <h2>Climate Analysis for Sustainable Design</h2>
                <ul class="custom-list">
                    <li>Describe average climatic conditions and observed trends.</li>
                    <li>Relate their effects on energy efficiency and thermal comfort.</li>
                </ul>
                <canvas id="chart1" width="910" height="300" style="width:910px;height:300px;"></canvas>
            </section>

            <section>
                <h2>LEED-Specific Recommendations</h2>
                <ul class="custom-list">
                    <li><b>Energy & Atmosphere (EA):</b> Suggest strategies adapted to {city}'s climate.</li>
                    <li><b>Water Efficiency (WE):</b> Strategies for water use optimization.</li>
                    <li><b>Materials & Resources (MR):</b> Indicate low-impact, regionally sourced materials.</li>
                    <li><b>Indoor Environmental Quality (IEQ):</b> Provide recommendations for comfort and health in indoor spaces.</li>
                </ul>
            </section>

            <section>
                <h2>Action Plan and Next Steps</h2>
                <ul class="custom-list">
                    <li>List 3 to 5 practical initial actions.</li>
                </ul>
            </section>
        </main>

        <footer>
            <p>&copy; 2023 City Science. All rights reserved.</p>
        </footer>

        <script>
            alert('Click Print to save this report as a PDF. Please do not refresh the page.');
            window.print();
            const ctx = document.getElementById('chart1').getContext('2d');
            new Chart(ctx, {{
                type: 'line',
                data: {{
                    labels: Array.from({list(range(len(dados_weather['temperaturas'])))}),
                    datasets: [{{
                        label: 'Average Temperature (°C)',
                        data: {dados_weather['temperaturas']},
                        borderColor: '#00A65A',
                        borderWidth: 2,
                        fill: false
                    }}]
                }},
                options: {{
                    responsive: false,
                    plugins: {{
                        legend: {{ display: true }},
                        title: {{
                            display: true,
                            text: 'Temperature Trend in {city}'
                        }}
                    }},
                    scales: {{
                        y: {{ beginAtZero: false }},
                        x: {{ title: {{ display: true, text: 'Period (days/hours)' }} }}
                    }}
                }}
            }});
        </script>
    </body>
    </html>

    Rules:
    - Fill in all textual content, replacing placeholder bullet points with real LEED analysis and recommendations.
    - Maintain all HTML, CSS, and Chart.js inline.
    - The response must be a complete HTML page, ready to open in a browser.
    - Output must be entirely in English, including all titles, labels, and descriptive text.
    - Do not include any Markdown or explanations.
"""


    model = genai.GenerativeModel("models/gemini-2.5-flash")
    response = model.generate_content(prompt)
    
    html_content = response.text

    with open(output_filename, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✅ HTML page generated: {os.path.abspath(output_filename)}")

def gerar_boletim_html_management(
        city: str,
        problem: str,
        goal: str,
        budget: str,
        timeframe: str,
        priority: str,
        expected_impact: str,
        output_filename=OUTPUT_HTML):

    dados_weather = get_info(city)

    prompt = f"""
    You are an expert in urban planning, sustainability policy, and municipal management.
    Language: English.

    Generate a complete and visually structured **HTML Management Bulletin** for city administrators (such as mayors, urban planners, and sustainability directors).  
    The report must analyze regional conditions, interpret climate indicators, and propose strategic recommendations for governance, investment, and environmental action.

    Context:
    - City: {city}
    - Main Problem: {problem}
    - Goal: {goal}
    - Available Budget: {budget}
    - Estimated Timeframe: {timeframe}
    - Expected Impact: {expected_impact}
    - Priority Level: {priority}

    Environmental and meteorological indicators:
    - Temperatures: {dados_weather['temperaturas']}
    - Humidity: {dados_weather['umidades']}
    - Winds: {dados_weather['ventos']}
    - Cloud Cover: {dados_weather['nuvens']}
    - UV Index: {dados_weather['uvs']}

    Guidelines:
    - Treat the weather data as a time series with historical and forecasted values.
    - Analyze climate trends to assess environmental feasibility and infrastructure resilience.
    - Focus on actionable insights and decision-oriented recommendations.
    - The bulletin must be fully generated in **HTML**, ready for direct display and PDF export.
    - Avoid Markdown or explanations.

    Follow **exactly** this HTML structure and visual standard:

    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>City Science - Management Bulletin ({city})</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
            body {{
                font-family: 'Roboto', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f5f8fc;
                color: #333;
                line-height: 1.6;
            }}
            header {{
                background-color: #004d66;
                color: #fff;
                padding: 25px 20px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            h1 {{ font-size: 2em; margin-bottom: 0; }}
            h2 {{
                color: #008CBA;
                border-bottom: 2px solid #008CBA;
                padding-bottom: 4px;
                margin-top: 30px;
            }}
            main {{ max-width: 1000px; margin: 20px auto; padding: 0 20px; }}
            section {{
                background-color: #fff;
                border-radius: 10px;
                padding: 25px;
                margin-bottom: 20px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            }}
            ul {{ padding-left: 20px; }}
            li {{ margin-bottom: 8px; }}
            canvas {{
                width: 910px !important;
                height: 300px !important;
                display: block;
                margin: 10px auto;
            }}
            footer {{
                text-align: center;
                color: #888;
                padding: 15px;
                border-top: 1px solid #ddd;
                font-size: 0.9em;
                margin-top: 20px;
            }}
            button {{
                background-color: #008CBA;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1em;
                transition: 0.3s;
            }}
            button:hover {{ background-color: #006f94; }}
        </style>
    </head>

    <body>
        <header>
            <h1>City Science - Regional Management Bulletin</h1>
            <h2>{city}</h2>
        </header>

        <main>
            <section>
                <h2>Situation Overview</h2>
                <ul>
                    <li><b>Main Problem:</b> {problem}</li>
                    <li><b>Goal:</b> {goal}</li>
                    <li><b>Available Budget:</b> {budget}</li>
                    <li><b>Implementation Timeframe:</b> {timeframe}</li>
                    <li><b>Expected Impact:</b> {expected_impact}</li>
                    <li><b>Priority Level:</b> {priority}</li>
                </ul>
            </section>

            <section>
                <h2>Environmental and Urban Analysis</h2>
                <p>Provide an integrated analysis of how the regional climate, urban structure, and environmental conditions influence local policy, investment feasibility, and sustainability goals.</p>
                <canvas id="climate_chart" width="910" height="300"></canvas>
            </section>

            <section>
                <h2>Strategic Recommendations</h2>
                <ul>
                    <li>Identify investment priorities compatible with budget constraints and environmental data.</li>
                    <li>Suggest sustainable infrastructure or green policy measures.</li>
                    <li>Propose stakeholder and community engagement strategies.</li>
                </ul>
            </section>

            <section>
                <h2>Implementation Roadmap</h2>
                <ul>
                    <li>Step 1: Immediate short-term actions (emergency or preparation).</li>
                    <li>Step 2: Medium-term development projects and governance adjustments.</li>
                    <li>Step 3: Long-term sustainability, monitoring, and resilience programs.</li>
                </ul>
            </section>
        </main>

        <footer>
            <p>&copy; 2025 City Science. All rights reserved.</p>
        </footer>

        <script>
            alert('Click on Print to save your management bulletin as a PDF. Do not refresh the page.');
            window.print();

            const ctx = document.getElementById('climate_chart').getContext('2d');
            new Chart(ctx, {{
                type: 'line',
                data: {{
                    labels: Array.from({list(range(len(dados_weather['temperaturas'])))}),
                    datasets: [
                        {{
                            label: 'Temperature (°C)',
                            data: {dados_weather['temperaturas']},
                            borderColor: '#FF5733',
                            borderWidth: 2,
                            fill: false
                        }},
                        {{
                            label: 'Humidity (%)',
                            data: {dados_weather['umidades']},
                            borderColor: '#008CBA',
                            borderWidth: 2,
                            fill: false
                        }},
                        {{
                            label: 'Wind (km/h)',
                            data: {dados_weather['ventos']},
                            borderColor: '#28a745',
                            borderWidth: 2,
                            fill: false
                        }}
                    ]
                }},
                options: {{
                    responsive: false,
                    plugins: {{
                        legend: {{ display: true }},
                        title: {{
                            display: true,
                            text: 'Climate Patterns in {city}'
                        }}
                    }},
                    scales: {{
                        y: {{ beginAtZero: false }},
                        x: {{ title: {{ display: true, text: 'Time (days/hours)' }} }}
                    }}
                }}
            }});
        </script>
    </body>
    </html>

    Requirements:
    - Replace placeholders with realistic and coherent content.
    - Keep the visual identity consistent with other City Science reports.
    - Output must be a complete HTML document.
    """


    model = genai.GenerativeModel("models/gemini-2.5-flash")
    response = model.generate_content(prompt)

    html_content = response.text

    with open(output_filename, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✅ Management HTML report generated: {os.path.abspath(output_filename)}")