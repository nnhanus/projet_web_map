var elevations = document.getElementById('elevations');
var map_html = document.getElementById('map');
var main_wrapper = document.getElementById('main-wrapper');
var path_dropdown = document.getElementById('path-dropdown');

var map = L.map('map').setView([51.505, -0.09], 13);
map.on('click', on_deselect);
var selected_path;
var selected_wp = [];
var all_paths = [];

var current_chart;
var chart_canvas;

function get_local_path(name)
{
	for(var path of all_paths)
	{
		if(path.name == name) return path;
	}
}

function update_all_paths_from_server()
{
	$.ajax
	({
		url: '/get-all-paths',
		type: 'GET',
		success: function(data) 
		{
			// console.log('Received server paths:');
			// console.log(data);
			for(var server_path of data)
			{
				var local_path = get_local_path(server_path.name);
				if(!local_path) // path was imported by another user
				{
					make_local_path(server_path.points, server_path.elevations, server_path.name, server_path.description, server_path.waypoints);
				}
				else // update the path's color from the server
				{
					set_path_color(local_path, server_path.color);
				}
			}
		},
		error: function(xhr, status, error) 
		{
			console.log('Couldn\'t get path from server:', error);
		}
	})
}

//Get the paths from the server every 5 seconds.
//todo : refine refresh time to be the most accurate and usable
setInterval(update_all_paths_from_server, 5000);

function display_popup_at(latlon, content)
{
	var popupcontent = ''
		+'<popup>'
		+ content
		+'</popup>';
	
	L.popup()
	.setLatLng(latlon)
	.setContent(popupcontent)
	.openOn(map);
}

function mapDrop(event)
{
	event.preventDefault();

	for(var file of event.dataTransfer.files)
	{
		console.log(file);

		const reader = new FileReader();
		reader.addEventListener('load', 
		(event) => 
		{
			const fileContent = event.target.result;
			const gpx_doc = (new DOMParser()).parseFromString(fileContent, 'text/xml');
			try 
			{ 
				path_from_gpx(gpx_doc); 
			} 
			catch (error) 
			{ 
				console.log('gpx read error : \n' + error);
				const warning = 'Error reading gpx file : '+ file.name;
				display_popup_at(map.getCenter(), warning);
			}

		});
		reader.readAsText(file);
	}
}

function format_name_desc_html(name, desc)
{
	return '<h1>' + name + '</h1>' + '<p>' + desc + '</p>'
}

function display_name_desc_popup_at(latlon, title, description)
{
	return display_popup_at(latlon, format_name_desc_html(title, description));
}

function postajax(url, data, callback)
{
	$.ajax
	({
		type: 'POST',
		url: url,
		data: data,
		success: function(data){ callback(data) },
	});
}



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
		elevations.style.display = 'none';

		// removing waypoints from the map
		for(wp of selected_wp) wp.remove();
		selected_wp = [];
	}
}

function trace_elevations(path)
{
	// show elevations again
	elevations.style.display = 'block';

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

	// Create the chart
	const myChart = new Chart(elevations.getContext('2d'), 
	{
		type: 'scatter',
		data: data,
		options: 
		{
			responsive: true,
			maintainAspectRatio: true,
			aspectRatio: 3, // = width/height
			tooltips: 
			{ 
				enabled: true,
				callbacks:
				{
					label: function(item)
					{
						if(item.datasetIndex != 1) return '';
						else
						{
							let waypoint = path.waypoints[item.index];
							return waypoint.name + ': ' + waypoint.desc;
						}
					}
				} 
			}
		}
	});

	current_chart = myChart;
	chart_canvas = myChart.canvas;

	myChart.canvas.onclick = 
	function(event) 
	{
		const activePoints = myChart.getElementAtEvent(event);
		if (activePoints && activePoints.length) 
		{
			const selected_point = activePoints[0];
			const datasetIndex = selected_point._datasetIndex;
			const index = selected_point._index;

			if(datasetIndex == 1) // if pois dataset
			{
				let waypoint = path.waypoints[index];
				alert(waypoint.name + ': ' + waypoint.desc);
			}
		}
	};
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
			display_name_desc_popup_at(event.latlng, name, desc);
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

function select_path_from_name(name)
{
	const path = get_local_path(name);
	map.fitBounds(path.polyline.getBounds())
	on_path_selection(path);
}

const parser = new XMLParser
(
{
	attributeNamePrefix : "",
	// attrNodeName: false,
	// textNodeName : "#text",
	ignoreAttributes : false,
	ignoreNameSpace: false,
	CDATASection: true, //idk how this works but it should help maybe
});

function make_local_path(points, elevs, name, desc, waypoints)
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

	var path_element = document.createElement('li');
	path_element.setAttribute('class', 'dropdown-item bg-black text-white');
	path_element.setAttribute('onclick', 'select_path_from_name(\''+path.name+'\')');
	path_element.innerHTML = path.name;
	path_dropdown.appendChild(path_element);

	polyline.on('click', 
	(event) =>
	{
		// prevent the map from getting the event.
		L.DomEvent.stopPropagation(event);
		display_name_desc_popup_at(event.latlng, name, desc);
		on_path_selection(path);
	});
}

function make_path(points, elevs, name, desc, waypoints)
{
	make_local_path(points, elevs, name, desc, waypoints);

	// Updating server side : 
	// create path with name
	// fill path data in multiple request when server received the name
	postajax('/path-name', {name: name}, 
	(_response)=>
	{
		console.log('Server received path name')
		postajax('/path-desc', {name: name, description:desc}, (_response)=> {console.log('Server received path desc')});
		postajax('/path-points', {name: name, points:points}, (_response)=> {console.log('Server received path points')});
		postajax('/path-elevs', {name: name, elevations:elevs}, (_response)=> {console.log('Server received path elevations')});
		if(waypoints) postajax('/path-pois', {name: name, waypoints: waypoints}, (_response)=> {console.log('Server received path pois')});
	});
}

function set_path_color(path, color)
{
	path.polyline.setStyle({color:color});
	path.color = color;
	path.polyline.redraw();
}

function set_team(color)
{
	if(selected_path)
	{
		set_path_color(selected_path, color);
		postajax('/path-color', {name:selected_path.name, color:color}, (_e)=>{console.log('Server received color change')})
	}
}

function path_from_gpx(data)
{
	var name = data.getElementsByTagName("name")[0].textContent;
	var desc = data.getElementsByTagName("desc")[0].textContent;
	var track_xml = data.getElementsByTagName("trk")[0].innerHTML;
	var waypoints_elems = data.getElementsByTagName("wpts");
	var waypoints = [];
	if(waypoints_elems && waypoints_elems.length)
	{
		var waypoints_xml = waypoints_elems[0].innerHTML;
		waypoints = parser.parse(waypoints_xml).wpt;
	} 
	
	// replace links with http links
	desc = desc.replace(/\[url=([^\]]+)\]([^\[]+)\[\/url\]/g, '<a href="$1">$2</a>');

	var track_segment = parser.parse(track_xml).trkseg;

	let latlons = []
	let elevs = []
	for(pt of track_segment.trkpt)
	{
		latlons.push([parseFloat(pt.lat), parseFloat(pt.lon)])
		elevs.push(pt.ele);
	}
	make_path(latlons, elevs, name, desc, waypoints);
}

// temporary debug, moved to server side (default paths, in the json directly).
// $.get('../data/fred-path.gpx', path_from_gpx);
// $.get('../data/vane-path.gpx', path_from_gpx);

update_all_paths_from_server();