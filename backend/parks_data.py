"""Curated data to enrich NPS API: start cities, top trails per park, gas cost defaults."""

# Major US start locations (cities + airports) with coordinates
START_CITIES = [
    {"id": "lax", "name": "Los Angeles, CA", "lat": 34.0522, "lng": -118.2437},
    {"id": "sfo", "name": "San Francisco, CA", "lat": 37.7749, "lng": -122.4194},
    {"id": "las", "name": "Las Vegas, NV", "lat": 36.1699, "lng": -115.1398},
    {"id": "phx", "name": "Phoenix, AZ", "lat": 33.4484, "lng": -112.0740},
    {"id": "den", "name": "Denver, CO", "lat": 39.7392, "lng": -104.9903},
    {"id": "slc", "name": "Salt Lake City, UT", "lat": 40.7608, "lng": -111.8910},
    {"id": "sea", "name": "Seattle, WA", "lat": 47.6062, "lng": -122.3321},
    {"id": "pdx", "name": "Portland, OR", "lat": 45.5152, "lng": -122.6784},
    {"id": "bzn", "name": "Bozeman, MT", "lat": 45.6770, "lng": -111.0429},
    {"id": "jac", "name": "Jackson, WY", "lat": 43.4799, "lng": -110.7624},
    {"id": "abq", "name": "Albuquerque, NM", "lat": 35.0844, "lng": -106.6504},
    {"id": "dfw", "name": "Dallas, TX", "lat": 32.7767, "lng": -96.7970},
    {"id": "msp", "name": "Minneapolis, MN", "lat": 44.9778, "lng": -93.2650},
    {"id": "atl", "name": "Atlanta, GA", "lat": 33.7490, "lng": -84.3880},
    {"id": "mia", "name": "Miami, FL", "lat": 25.7617, "lng": -80.1918},
    {"id": "nyc", "name": "New York, NY", "lat": 40.7128, "lng": -74.0060},
    {"id": "bos", "name": "Boston, MA", "lat": 42.3601, "lng": -71.0589},
    {"id": "ord", "name": "Chicago, IL", "lat": 41.8781, "lng": -87.6298},
    {"id": "anc", "name": "Anchorage, AK", "lat": 61.2181, "lng": -149.9003},
    {"id": "hnl", "name": "Honolulu, HI", "lat": 21.3099, "lng": -157.8581},
]

# Curated top trails per park code (3 per park for top NPs)
CURATED_TRAILS = {
    "yose": [
        {"name": "Mist Trail to Vernal Fall", "difficulty": "Moderate", "length": "3.0 mi", "description": "Famous granite staircase alongside a thundering waterfall."},
        {"name": "Half Dome via Cables", "difficulty": "Strenuous", "length": "14.2 mi", "description": "Iconic cable-assisted ascent to Yosemite's most recognized summit."},
        {"name": "Lower Yosemite Fall", "difficulty": "Easy", "length": "1.0 mi", "description": "Short paved loop with breathtaking views of North America's tallest waterfall."},
    ],
    "zion": [
        {"name": "Angels Landing", "difficulty": "Strenuous", "length": "5.4 mi", "description": "Chain-assisted razorback ridge with panoramic canyon views."},
        {"name": "The Narrows", "difficulty": "Moderate", "length": "9.4 mi", "description": "Wade upstream through a slot canyon carved by the Virgin River."},
        {"name": "Emerald Pools", "difficulty": "Easy", "length": "3.0 mi", "description": "Cascading pools fed by hanging gardens and desert springs."},
    ],
    "grca": [
        {"name": "Bright Angel Trail", "difficulty": "Strenuous", "length": "9.5 mi", "description": "Switchbacks into the canyon past resthouses and Indian Garden."},
        {"name": "South Kaibab Trail", "difficulty": "Strenuous", "length": "7.1 mi", "description": "Sweeping ridge views to Skeleton Point and beyond."},
        {"name": "Rim Trail", "difficulty": "Easy", "length": "13.0 mi", "description": "Paved rim walk connecting viewpoints of the South Rim."},
    ],
    "yell": [
        {"name": "Grand Prismatic Overlook", "difficulty": "Easy", "length": "1.6 mi", "description": "Elevated view of America's most colorful hot spring."},
        {"name": "Mount Washburn", "difficulty": "Moderate", "length": "6.4 mi", "description": "High ridge hike with lookout tower and wildflower meadows."},
        {"name": "Uncle Tom's Trail", "difficulty": "Moderate", "length": "0.6 mi", "description": "Steel staircase to the base of Lower Yellowstone Falls."},
    ],
    "grte": [
        {"name": "Cascade Canyon", "difficulty": "Moderate", "length": "9.1 mi", "description": "Boat-access hike into the heart of the Tetons."},
        {"name": "Jenny Lake Loop", "difficulty": "Easy", "length": "7.1 mi", "description": "Classic lakeside loop with Teton reflections."},
        {"name": "Delta Lake", "difficulty": "Strenuous", "length": "7.4 mi", "description": "Off-trail boulder scramble to a turquoise alpine lake."},
    ],
    "glac": [
        {"name": "Highline Trail", "difficulty": "Moderate", "length": "11.8 mi", "description": "Cliffside traverse along the Continental Divide."},
        {"name": "Grinnell Glacier", "difficulty": "Strenuous", "length": "10.6 mi", "description": "Alpine climb to one of the park's disappearing glaciers."},
        {"name": "Hidden Lake Overlook", "difficulty": "Moderate", "length": "2.7 mi", "description": "Boardwalk to mountain goats and lake views from Logan Pass."},
    ],
    "romo": [
        {"name": "Emerald Lake", "difficulty": "Moderate", "length": "3.2 mi", "description": "Chain of alpine lakes beneath towering peaks."},
        {"name": "Sky Pond", "difficulty": "Strenuous", "length": "9.0 mi", "description": "Climb past Timberline Falls to a dramatic cirque lake."},
        {"name": "Bear Lake Loop", "difficulty": "Easy", "length": "0.8 mi", "description": "Accessible loop with postcard mountain reflections."},
    ],
    "acad": [
        {"name": "Precipice Trail", "difficulty": "Strenuous", "length": "2.1 mi", "description": "Iron-rung cliff climb on the face of Champlain Mountain."},
        {"name": "Jordan Pond Path", "difficulty": "Easy", "length": "3.3 mi", "description": "Flat lakeside loop with views of the Bubbles."},
        {"name": "Cadillac North Ridge", "difficulty": "Moderate", "length": "4.4 mi", "description": "Open granite ridge to the highest peak on the Atlantic coast."},
    ],
    "olym": [
        {"name": "Hoh River Trail", "difficulty": "Moderate", "length": "10.6 mi", "description": "Temperate rainforest walk along a glacier-fed river."},
        {"name": "Hurricane Hill", "difficulty": "Moderate", "length": "3.2 mi", "description": "Alpine ridge with wildflowers and Olympic peak views."},
        {"name": "Rialto Beach to Hole-in-the-Wall", "difficulty": "Easy", "length": "3.3 mi", "description": "Driftwood coastline to a sea-arch at low tide."},
    ],
    "mora": [
        {"name": "Skyline Trail", "difficulty": "Strenuous", "length": "5.6 mi", "description": "Paradise loop with panoramic Rainier and Tatoosh views."},
        {"name": "Tolmie Peak Lookout", "difficulty": "Moderate", "length": "6.5 mi", "description": "Fire lookout overlooking Eunice Lake and Rainier."},
        {"name": "Grove of the Patriarchs", "difficulty": "Easy", "length": "1.5 mi", "description": "Old-growth island grove reached by a suspension bridge."},
    ],
    "arch": [
        {"name": "Delicate Arch", "difficulty": "Moderate", "length": "3.0 mi", "description": "Slickrock ascent to Utah's most iconic arch."},
        {"name": "Devils Garden Loop", "difficulty": "Strenuous", "length": "7.8 mi", "description": "Adventurous loop past Landscape Arch and fin country."},
        {"name": "Windows Loop", "difficulty": "Easy", "length": "1.0 mi", "description": "Short loop past North & South Windows and Turret Arch."},
    ],
    "cany": [
        {"name": "Mesa Arch Loop", "difficulty": "Easy", "length": "0.7 mi", "description": "Sunrise-framing arch on the Island in the Sky rim."},
        {"name": "Syncline Loop", "difficulty": "Strenuous", "length": "8.0 mi", "description": "Rugged loop circumnavigating Upheaval Dome."},
        {"name": "Chesler Park", "difficulty": "Moderate", "length": "6.0 mi", "description": "Spires and meadows deep in the Needles district."},
    ],
    "brca": [
        {"name": "Navajo/Queens Garden Loop", "difficulty": "Moderate", "length": "3.0 mi", "description": "The classic hoodoo introduction through Wall Street."},
        {"name": "Fairyland Loop", "difficulty": "Strenuous", "length": "8.0 mi", "description": "Quieter loop with some of the park's finest hoodoos."},
        {"name": "Sunset to Sunrise Rim", "difficulty": "Easy", "length": "1.0 mi", "description": "Paved rim walk with amphitheater panoramas."},
    ],
    "crla": [
        {"name": "Cleetwood Cove", "difficulty": "Moderate", "length": "2.2 mi", "description": "Only legal access to the lakeshore and boat tours."},
        {"name": "Mount Scott", "difficulty": "Strenuous", "length": "4.4 mi", "description": "Highest peak in the park with a summit fire lookout."},
        {"name": "Garfield Peak", "difficulty": "Moderate", "length": "3.4 mi", "description": "Wildflowers and expansive caldera views."},
    ],
    "jotr": [
        {"name": "Ryan Mountain", "difficulty": "Moderate", "length": "3.0 mi", "description": "Highest accessible summit with 360° desert views."},
        {"name": "Hidden Valley", "difficulty": "Easy", "length": "1.0 mi", "description": "Boulder-ringed basin loop through Joshua trees."},
        {"name": "Lost Palms Oasis", "difficulty": "Strenuous", "length": "7.5 mi", "description": "Desert traverse to the park's largest palm oasis."},
    ],
    "seki": [
        {"name": "General Sherman Trail", "difficulty": "Easy", "length": "1.0 mi", "description": "Paved walk to the largest tree on Earth by volume."},
        {"name": "Moro Rock", "difficulty": "Moderate", "length": "0.5 mi", "description": "Carved granite staircase to a Sierra vista point."},
        {"name": "Tokopah Falls", "difficulty": "Easy", "length": "3.8 mi", "description": "River walk to a 1,200-ft granite waterfall."},
    ],
    "shen": [
        {"name": "Old Rag Mountain", "difficulty": "Strenuous", "length": "9.4 mi", "description": "Boulder scramble to Virginia's most famous summit."},
        {"name": "Dark Hollow Falls", "difficulty": "Moderate", "length": "1.4 mi", "description": "Short, steep walk to a tiered cascading waterfall."},
        {"name": "Stony Man", "difficulty": "Easy", "length": "1.6 mi", "description": "Quick ridge hike to sweeping Shenandoah views."},
    ],
    "grsm": [
        {"name": "Alum Cave to Mt. LeConte", "difficulty": "Strenuous", "length": "11.0 mi", "description": "Bluffs, arches, and a lodge-topped summit."},
        {"name": "Clingmans Dome", "difficulty": "Easy", "length": "1.0 mi", "description": "Paved path to the highest point in the Smokies."},
        {"name": "Chimney Tops", "difficulty": "Moderate", "length": "3.6 mi", "description": "Steep climb to a dramatic rock pinnacle viewpoint."},
    ],
    "ever": [
        {"name": "Anhinga Trail", "difficulty": "Easy", "length": "0.8 mi", "description": "Boardwalk teeming with alligators, turtles, and wading birds."},
        {"name": "Shark Valley Loop", "difficulty": "Easy", "length": "15.0 mi", "description": "Paved biking loop with observation tower over the River of Grass."},
        {"name": "Pa-hay-okee Overlook", "difficulty": "Easy", "length": "0.2 mi", "description": "Short boardwalk to sweeping sawgrass prairie views."},
    ],
    "bibe": [
        {"name": "Lost Mine Trail", "difficulty": "Moderate", "length": "4.8 mi", "description": "Classic Chisos Mountains hike with panoramic views."},
        {"name": "Santa Elena Canyon", "difficulty": "Moderate", "length": "1.7 mi", "description": "Walk into a 1,500-ft limestone canyon on the Rio Grande."},
        {"name": "Window Trail", "difficulty": "Moderate", "length": "5.5 mi", "description": "Descent through Oak Creek Canyon to a dramatic pour-off."},
    ],
}

# Generic fallback trails for parks without curated data
def generic_trails(park_name: str):
    return [
        {"name": f"{park_name} Scenic Loop", "difficulty": "Easy", "length": "2.0 mi", "description": f"An accessible introduction to the landscapes of {park_name}."},
        {"name": f"{park_name} Ridge Trail", "difficulty": "Moderate", "length": "5.5 mi", "description": f"A classic day hike through varied terrain in {park_name}."},
        {"name": f"{park_name} Summit Route", "difficulty": "Strenuous", "length": "9.0 mi", "description": f"A full-day ascent with rewarding panoramic views."},
    ]

# Cost defaults
DEFAULT_MPG = 28.0
DEFAULT_GAS_PRICE = 3.75  # USD / gallon
LODGING_PER_NIGHT_LOW = 85
LODGING_PER_NIGHT_HIGH = 220
FOOD_PER_DAY_LOW = 30
FOOD_PER_DAY_HIGH = 80
AVG_DRIVING_MPH = 55.0
