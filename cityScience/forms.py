from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, SubmitField, SelectField, DecimalField
from wtforms.validators import DataRequired, NumberRange, Optional

class BulletinForm(FlaskForm):
    city = StringField(
        'City/State (Required)', 
        validators=[DataRequired(message="This field is required.")],
        render_kw={"placeholder": "Enter city and state..."}
    )
    prompt = TextAreaField(
        'Description of the Situation or Request (Required)', 
        validators=[DataRequired(message="This field is required.")],
        render_kw={"placeholder": "Write the main content or request for the bulletin..."}
    )
    obs = TextAreaField(
        'Observations (optional)',
        render_kw={"placeholder": "Add any additional notes or observations..."}
    )
    submit = SubmitField('Submit')


class BulletinBuildForm(FlaskForm):
    city = StringField(
        'City/State of the Construction (Required)', 
        validators=[DataRequired(message="Location is essential for zoning and resource criteria.")]
    )
    
    project_type = SelectField(
        'Project Type',
        choices=[
            ('BDC', 'New Construction'),
            ('IDCL', 'Interior Design and Construction'),
            ('OML', 'Operations and Maintenance'),
            ('HDC', 'Homes Design and Construction'),
        ],
        validators=[DataRequired(message="The project type defines the applicable credits.")]
    )

    leed_goal = SelectField(
        'Target LEED Certification Level',
        choices=[
            ('Certified', 'Certified (Basic)'),
            ('Silver', 'Silver'),
            ('Gold', 'Gold'),
            ('Platinum', 'Platinum (Highest Sustainability)'),
        ],
        validators=[DataRequired(message="Select your desired level of ambition for the project.")]
    )
    
    focus_area = SelectField(
        'Main Focus Area for Optimization',
        choices=[
            ('Energy', 'Energy Efficiency (e.g., HVAC, Lighting)'),
            ('Water', 'Water Efficiency (e.g., Rainwater Harvesting, Landscaping)'),
            ('Materials', 'Materials and Resources (e.g., Low Carbon, Regional)'),
            ('Location', 'Location and Transportation (e.g., Density, Accessibility)'),
            ('Indoor', 'Indoor Environmental Quality (e.g., Ventilation, Comfort)'),
        ],
        validators=[DataRequired(message="Select where the AI should focus cost/impact optimization.")]
    )
    
    project_details = TextAreaField(
        'Describe the Specific Challenge or Question (Context)', 
        validators=[DataRequired(message="Provide details such as budget, current phase, and main obstacles.")],
        description="Include information about budget constraints, timeline, or any solutions already being considered."
    )
    
    submit = SubmitField('Generate Technical Bulletin')

class BulletinPolicyForm(FlaskForm):
    city = StringField(
        'City/Region (Required)',
        validators=[DataRequired(message="Please specify the region where the issue occurs.")]
    )
    
    problem = TextAreaField(
        'Identified Problem',
        validators=[DataRequired(message="Describe the main issue affecting your region.")],
        description="Example: Flooding in low-lying areas, excessive air pollution, lack of green spaces, etc."
    )
    
    goal = TextAreaField(
        'Project Objective',
        validators=[DataRequired(message="Describe the goal of your intervention or policy.")],
        description="Example: Reduce emissions by 20%, improve water retention, enhance urban mobility, etc."
    )
    
    budget = DecimalField(
        'Available Budget (in USD)',
        validators=[
            Optional(),
            NumberRange(min=0, message="Budget must be a positive number.")
        ],
        description="Provide an estimated or confirmed amount available for the project."
    )
    
    timeframe = StringField(
        'Estimated Implementation Period',
        validators=[Optional()],
        description="Example: 6 months, 1 year, or specific start/end dates."
    )
    
    priority = SelectField(
        'Strategic Priority',
        choices=[
            ('environment', 'Environmental Sustainability'),
            ('infrastructure', 'Urban Infrastructure'),
            ('health', 'Public Health'),
            ('mobility', 'Urban Mobility'),
            ('energy', 'Energy and Efficiency'),
            ('education', 'Environmental Education'),
        ],
        validators=[DataRequired(message="Select the main strategic priority of this initiative.")]
    )
    
    expected_impact = TextAreaField(
        'Expected Impact',
        validators=[Optional()],
        description="Describe the measurable impact you expect (e.g., reduction in pollution levels, improved quality of life, etc.)."
    )
    
    submit = SubmitField('Generate Policy Bulletin')

class InsightForm(FlaskForm):
    city = StringField('City you want to search for.', validators=[DataRequired(message="This field is required.")])
    submit = SubmitField('Submit')