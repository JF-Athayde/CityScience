from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, SubmitField, SelectField
from wtforms.validators import DataRequired

class BulletinForm(FlaskForm):
    city = StringField('Cidade/Estado', validators=[DataRequired(message="Campo obrigatório")])
    prompt = TextAreaField('Prompt', validators=[DataRequired(message="Campo obrigatório")])
    obs = TextAreaField('Observações (opcional)')
    submit = SubmitField('Enviar')

class BulletinBuildForm(FlaskForm):
    city = StringField(
        'Cidade/Estado da Construção (Obrigatório)', 
        validators=[DataRequired(message="A localização é essencial para critérios de zoneamento e recursos.")]
    )
    
    project_type = SelectField(
        'Tipo de Projeto',
        choices=[
            ('BDC', 'New Construction (Construção Nova)'),
            ('IDCL', 'Interior Design and Construction (Interiores)'),
            ('OML', 'Operations and Maintenance (Operação e Manutenção)'),
            ('HDC', 'Homes Design and Construction (Residencial)'),
        ],
        validators=[DataRequired(message="O tipo de projeto define os créditos aplicáveis.")]
    )

    leed_goal = SelectField(
        'Nível de Certificação LEED Almejado',
        choices=[
            ('Certified', 'Certified (Básico)'),
            ('Silver', 'Silver (Prata)'),
            ('Gold', 'Gold (Ouro)'),
            ('Platinum', 'Platinum (Platina - Maior Sustentabilidade)'),
        ],
        validators=[DataRequired(message="Escolha o nível de ambição para o seu projeto.")]
    )
    
    focus_area = SelectField(
        'Área de Foco Principal para Otimização',
        choices=[
            ('Energy', 'Eficiência Energética (Ex: HVAC, Iluminação)'),
            ('Water', 'Uso Racional da Água (Ex: Captação, Paisagismo)'),
            ('Materials', 'Materiais e Recursos (Ex: Baixo Carbono, Regional)'),
            ('Location', 'Localização e Transporte (Ex: Densidade, Acesso)'),
            ('Indoor', 'Qualidade Ambiental Interna (Ex: Ventilação, Conforto)'),
        ],
        validators=[DataRequired(message="Selecione onde a IA deve focar a otimização de custos/impacto.")]
    )
    
    project_details = TextAreaField(
        'Descreva o Desafio ou Pergunta Específica (Contexto)', 
        validators=[DataRequired(message="Forneça detalhes como orçamento, fase atual e maiores obstáculos.")],
        description="Inclua informações sobre restrições orçamentárias, prazo, ou qualquer solução que já esteja em consideração."
    )
    
    submit = SubmitField('Gerar Boletim Técnico')