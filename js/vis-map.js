var elevations = document.getElementById('elevations');
var map_html = document.getElementById('map');
var main_wrapper = document.getElementById('main-wrapper');

var map = L.map('map').setView([51.505, -0.09], 13);
map.on('click', on_deselect);
var selected_path;
var selected_wp = [];
var all_paths = [];

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', 
{
	maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})
.addTo(map);

function on_deselect()
{
	if(selected_path)
	{
		// change polyline style
		selected_path.polyline.setStyle({weight:3});
		selected_path = undefined;

		// hiding elevation canvas
		var ctx = elevations.getContext("2d");
		ctx.canvas.width = 0;
		ctx.canvas.height = 0;

		// removing waypoints from the map
		for(wp of selected_wp) wp.remove();
		selected_wp = [];
	}
}

function trace_elevations(path)
{
	function dist(p0,p1){ return Math.sqrt(Math.pow(p1[0]-p0[0],2) + Math.pow(p1[1]-p0[1],2));}
	let wp_idxs = []
	// getting closest point to POIs
	for(var waypoint of path.waypoints)
	{
		var min_d = Infinity;
		var index = undefined;
		let wp = [parseFloat(waypoint.lat), parseFloat(waypoint.lon)];
		for(var i = 0; i < path.points.length; i++)
		{
			let point = path.points[i];
			let d = dist(point, wp);
			
			if(d < min_d)
			{
				min_d = d;
				index = i;
			}
		}
		wp_idxs.push(index);
	}

	// setting data :
	// - line chart of elevations
	// - circles on POIs
	const data = 
	{
		datasets: 
		[
			{
				label: 'Elevations',
				data: path.distances.map((x, i) => ({ x, y: path.elevations[i] })),
				backgroundColor: 'rgba(111, 45, 168, 0.2)',
				borderColor: 'rgba(111, 45, 168, 1)', 
				borderWidth: 0,
				pointRadius: 0, // Set the radius of the points
				pointHoverRadius: 0, // Set the hover radius of the points
				pointStyle: 'circle', // Set the style of the points to circles
				showTooltips: false,
				type: 'line',
			},

			{
				label: 'POIs',
				data: wp_idxs.map((idx) => ({ x: path.distances[idx], y: path.elevations[idx] })),
				backgroundColor: 'rgba(45, 111, 168, 0.2)',
				borderColor: 'rgba(45, 111, 168, 1)',
				borderWidth: 1,
				pointRadius: 5, // Set the radius of the points
				pointHoverRadius: 8, // Set the hover radius of the points
				pointStyle: 'circle', // Set the style of the points to circles
				showLine: false,
				type: 'line',
			},

		]
	};

	// Create the chart (no tooltip, responsive = fill container)
	const myChart = new Chart(elevations.getContext('2d'), 
	{
		type: 'scatter',
		data: data,
		options: 
		{
			responsive: true,
			maintainAspectRatio: true,
			tooltips: { enabled: false }
		}
	});

	myChart.canvas.onclick = 
	function(event) 
	{
		const activePoints = myChart.getElementAtEvent(event);
		if (activePoints && activePoints.length) 
		{
			const selected_point = activePoints[0];
			const dataSetIndex = selected_point._datasetIndex;
			const dataIndex = selected_point._index;

			if(dataSetIndex == 1)
			{
				let waypoint = path.waypoints[dataIndex];
				//todo : show some popup here.
				alert(waypoint.name + ' ' + waypoint.desc);
			}
		}
	};
}

function display_popup_at(latlon, title, description)
{
	var popupcontent = ''
		+'<popup>'
		+ '<h1>' + title + '</h1>'
		+ '<p>' + description + '</p>'
		+'</popup>';
	
	L.popup()
	.setLatLng(latlon)
	.setContent(popupcontent)
	.openOn(map);
}

function trace_mapwaypoints(waypoints)
{
	for(var point of waypoints)
	{
		let name = point.name;
		let desc = point.desc;
		var circle = L
		.circle([point.lat, point.lon], {radius: 20})
		.addTo(map)
		.on('click', 
		(event)=>
		{
			L.DomEvent.stopPropagation(event); 
			display_popup_at(event.latlng, name, desc);
		});

		selected_wp.push(circle);
	}
}

function on_path_selection(path)
{
	on_deselect();
	selected_path = path;
	
	selected_path.polyline.setStyle({weight:5});
	selected_path.polyline.redraw();

	//draw_canv(path.waypoints);

	trace_mapwaypoints(path.waypoints);
	trace_elevations(path);
}

function make_path(points, elevs, name, desc, waypoints)
{
	var polyline = L
	.polyline(points, {color: 'black'})
	.addTo(map);

	map.fitBounds(polyline.getBounds());

	function dist(p0,p1){ return Math.sqrt(Math.pow(p1[0]-p0[0],2) + Math.pow(p1[1]-p0[1],2));}
	
	var curr_dist = 0;
	var dists = [0];
	for(var i = 1; i < points.length; i++)
	{
		curr_dist = curr_dist + dist(points[i], points[i-1]);
		dists.push(curr_dist);
	}
		
	var path =
	{
		name: name,
		points: points,
		description: desc,
		polyline: polyline,
		waypoints: waypoints,
		elevations: elevs,
		distances: dists,
		color: 'black',
	};

	all_paths.push(path);

	polyline.on('click', 
	(event) =>
	{
		// prevent the map from getting the event.
		L.DomEvent.stopPropagation(event);
		display_popup_at(event.latlng, name, desc);
		on_path_selection(path);
	});
}

function set_team(color)
{
	if(selected_path)
	{
		selected_path.polyline.setStyle({color:color});
		selected_path.color = color;
		selected_path.polyline.redraw();
	}
}

function draw_canv(waypoints)
{
	var canv = document.getElementById('myCanvas');
	var ctx = canv.getContext('2d');
	var ord = 10;

	ctx.moveTo(20, 0);
	ctx.lineTo(20, 400);
	ctx.stroke();

	
	for (pt of waypoints)
	{
		ctx.fillText(pt.name, 0, ord);
		ctx.fillText(pt.desc, 20, ord);
		ord += 20;
	}
}

const parser = new XMLParser(
{
	attributeNamePrefix : "",
	// attrNodeName: false,
	// textNodeName : "#text",
	ignoreAttributes : false,
	ignoreNameSpace: false,
	CDATASection: true, //idk how this works but it should help maybe
});

$.get('../data/vane-path.gpx', function(data)
	{
		var name = data.getElementsByTagName("name")[0].textContent;
		var desc = data.getElementsByTagName("desc")[0].textContent;
		var track_xml = data.getElementsByTagName("trk")[0].innerHTML;
		var waypoints_xml = data.getElementsByTagName("wpts")[0].innerHTML;
		
		// replace links with http links
		// this regex was provided by openai :)
		desc = desc.replace(/\[url=([^\]]+)\]([^\[]+)\[\/url\]/g, '<a href="$1">$2</a>');

		var track_segment = parser.parse(track_xml).trkseg;
		var waypoints = parser.parse(waypoints_xml).wpt;

		let latlons = []
		let elevs = []
		for(pt of track_segment.trkpt)
		{
			latlons.push([parseFloat(pt.lat), parseFloat(pt.lon)])
			elevs.push(pt.ele);
		}
		make_path(latlons, elevs, name, desc, waypoints);
	}
);