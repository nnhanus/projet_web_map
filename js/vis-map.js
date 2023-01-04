
//constant elements of the html page 
const elevations = document.getElementById('elevations');
const map_html = document.getElementById('map');
const main_wrapper = document.getElementById('main-wrapper');
const path_dropdown = document.getElementById('path-dropdown');
// leaflet map
var map = L.map('map').setView([51.505, -0.09], 13);
map.on('click', on_deselect);
// array of all the paths
var all_paths = [];
// current selection
var selected_path;
var selected_waypoints = [];
// current elevation chart and its canvas
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
				if(!local_path) local_path = make_local_path(server_path.points, server_path.elevations, server_path.name, server_path.description, server_path.waypoints);
				set_path_color(local_path, server_path.color);
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

function read_gpx_files(files)
{
	for(var file of files)
	{
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
		for(wp of selected_waypoints) wp.remove();
		selected_waypoints = [];
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

		selected_waypoints.push(circle);
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

function remove_path_from_name(name)
{
	const path_idx = all_paths.findIndex((v) => v.name == name);
	const removed_path = all_paths.splice(path_idx, 1)[0];
	if(selected_path && selected_path.name == removed_path.name) on_deselect();
	removed_path.polyline.remove();
	document.getElementById(removed_path.name).remove();
	postajax('/remove-path', {name:name}, (data)=>console.log('Correctly removed path from server'));
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

function make_local_path(points, elevs, name, desc, wps)
{
	if(get_local_path(name)) return undefined; 

	var waypoints = wps ? wps : [];
	
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
	path_element.setAttribute('style', 'display:grid; grid-template-columns: auto min-content;');
	path_element.setAttribute('id', path.name);
	{
		var path_name_elem = document.createElement('div');
		
		path_name_elem.setAttribute('class', 'dropdown-item bg-black text-white');
		path_name_elem.setAttribute('onclick', 'select_path_from_name(\''+path.name+'\')');
		path_name_elem.innerHTML = path.name;
		path_element.appendChild(path_name_elem);

		var path_rmv_elem = document.createElement('a');
		path_rmv_elem.setAttribute('onclick', 'remove_path_from_name(\''+path.name+'\')');
		path_rmv_elem.setAttribute('style', 'display: box; width: min-content; padding:0px 8px; right: 0%;');
		path_rmv_elem.innerHTML = 
		'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="red" class="bi bi-trash3" viewBox="0 0 16 16">\
			<path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>\
		</svg>';

		path_element.appendChild(path_rmv_elem);
	}

	path_dropdown.appendChild(path_element);

	polyline.on('click', 
	(event) =>
	{
		// prevent the map from getting the event.
		L.DomEvent.stopPropagation(event);
		display_name_desc_popup_at(event.latlng, name, desc);
		on_path_selection(path);
	});

	return path;
}

function make_path(points, elevs, name, desc, waypoints)
{
	const path = make_local_path(points, elevs, name, desc, waypoints);
	// Updating server side : 
	// create path with name
	// fill path data in multiple request when server received the name
	if(path)
	{
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