var map = L.map('map').setView([51.505, -0.09], 13);
map.on('click', on_deselect);
var selected_path;
var all_paths = [];

var elevations = document.getElementById('elevations');
var map_html = document.getElementById('map');

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
		selected_path.polyline.setStyle({weight:3});
		selected_path = undefined;

		var ctx = elevations.getContext("2d");
		ctx.canvas.width = 0;
		ctx.canvas.height = 0;
	}
}

function trace_elevations(path)
{
	var cnv_h = 200;

	var ctx = elevations.getContext("2d");
	ctx.canvas.width = map_html.offsetWidth;
	ctx.canvas.height = cnv_h;
	map_html.style.height = "calc(100vh-400px)"
	
	var max_dist = path.distances[path.distances.length-1];

	var cnv_w = elevations.offsetWidth;

	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, cnv_w, cnv_h);

	ctx.beginPath();
	ctx.strokeStyle = 'white';
	ctx.moveTo(0, cnv_h);
	let max_e = 0;

	for(var i = 0; i < path.elevations.length; i++)
	{
		if(path.elevations[i] > max_e) max_e = path.elevations[i];
	}

	for(var i = 0; i < path.distances.length; i++)
	{
		ctx.lineTo(cnv_w*path.distances[i]/max_dist, cnv_h-cnv_h*path.elevations[i]/max_e);
	}
	ctx.stroke();

	ctx.closePath();
}

function on_path_selection(path)
{
	on_deselect();
	selected_path = path;
	
	selected_path.polyline.setStyle({weight:5});
	selected_path.polyline.redraw();

	// trace_elevations(path);
}

function make_path(points, elevs, name, desc)
{
		var polyline = L.polyline(points, {color: 'black'}).addTo(map);
		map.fitBounds(polyline.getBounds());

		function dist(p0,p1){ return Math.sqrt(Math.pow(p1[0]-p0[0],2) + Math.pow(p1[1]-p0[1],2));}
		
		var curr_dist = 0;
		var dists = [0];
		for(var i = 1; i < points.length; i++)
		{
			curr_dist = curr_dist + dist(points[i], points[i-1]);
			dists.push(curr_dist);
		}
		
		console.log(dists);
		var path =
		{
			name: name,
			description: desc,
			polyline: polyline,
			elevations: elevs,
			distances: dists,
			color: 'black',
		};

		all_paths.push(path);

		polyline.on('click', 
		(event) =>
		{
			var popLocation= event.latlng;

			var popupcontent = ''
				+'<popup>'
				+ '<h1>' + name + '</h1>'
				+ '<p>' + desc + '</p>'
				+'</popup>';

			L.popup()
			.setLatLng(popLocation)
			.setContent(popupcontent)
			.openOn(map);
			
			on_path_selection(path);
			// prevent the map from getting the event.
			L.DomEvent.stopPropagation(event); 
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


const options = 
{
	attributeNamePrefix : "",
	// attrNodeName: false,
	// textNodeName : "#text",
	ignoreAttributes : false,
	ignoreNameSpace: false,
	CDATASection: true, //idk how this works but it should help maybe
};

const parser = new XMLParser(options);

$.get('../data/fred-path.gpx', function(data)
	{
		// console.log(data)
		var name = data.getElementsByTagName("name")[0].textContent;
		var desc = data.getElementsByTagName("desc")[0].textContent;
		var track_xml = data.getElementsByTagName("trk")[0].innerHTML;
		
		// replace links with http links
		// this regex was provided by openai :)
		desc = desc.replace(/\[url=([^\]]+)\]([^\[]+)\[\/url\]/g, '<a href="$1">$2</a>');

		var track_segment = parser.parse(track_xml).trkseg;

		let latlons = []
		let elevs = []
		for(pt of track_segment.trkpt)
		{
			latlons.push([parseFloat(pt.lat), parseFloat(pt.lon)])
			elevs.push(pt.ele);
		}
		make_path(latlons, elevs, name, desc);
	}
);