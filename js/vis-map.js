var map = L.map('map').setView([51.505, -0.09], 13);

var selected_path;
var all_paths = [];

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', 
{
	maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})
.addTo(map);



function create_polyline(points, elevs, name, desc)
{
		var polyline = L.polyline(points, {color: 'black'}).addTo(map);
		map.fitBounds(polyline.getBounds());
		
		var path =
		{
			name: name,
			description: desc,
			polyline: polyline,
			elevations: elevs,
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
			
			if(selected_path) selected_path.polyline.setStyle({weight:3});
			polyline.setStyle({weight:5});
			polyline.redraw();
			
			selected_path = path;
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
		create_polyline(latlons, elevs, name, desc);
	}
);