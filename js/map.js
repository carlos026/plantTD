function isRoad(mapId, x, y) {
	var isRoad = false;
	
	switch(mapId) {
		case 1:
			isRoad =((x == 0 && (y >= 0 && y <= 2)) ||
				(y == 2 && (x >= 0 && x < 70)) ||
				(x == 70 && (y >= 2 && y <= 28)) ||
				(y == 28 && (x <= 70 && x >= 60)) ||
				(x == 60 && (y <= 28 && y >= 5)) ||
				(y == 5 && (x <= 60 && x >= 40)) ||
				(x == 40 && (y >= 5 && y <= 25)) ||
				(y == 25 && (x <= 40 && x >= 30)) ||
				(x == 30 && (y >= 20 && y <= 25)) ||
				(y == 20 && (x <= 30 && x >= 5)) ||
				(x == 5 && (y <= 20 && y >= 10)) ||
				(y == 10 && (x >= 5 && x <= 75)) ||
				(x == 75 && (y >= 10 && y <= 30)));
			break;
		case 2:
			isRoad = ((x == 0 && (y >= 0 && y <= 2)) ||
				(y == 2 && (x >= 0 && x < 45)) ||
				(x == 45 && (y >= 2 && y <= 15)) ||
				(y == 15 && (x <= 45 && x >= 15)) ||
				(x == 15 && (y <= 15 && y >= 5)) ||
				(y == 5 && (x <= 15 && x >= 5)) ||
				(x == 5 && (y >= 5 && y <= 10)) ||
				(y == 10 && (x >= 5 && x <= 30)) ||
				(x == 30 && (y >= 10 && y <= 25)) ||
				(y == 25 && (x >= 30 && x <= 55)) ||
				(x == 55 && (y <= 25 && y >= 10)) ||
				(y == 10 && (x >= 55 && x <= 79)));
			break;
	}
	return isRoad;
}

// DRAG AND DROP
function dragOver(evt) {
  if (evt.preventDefault) evt.preventDefault();
  evt = evt || window.event;
  evt.dataTransfer.dropEffect = 'copy';
  return false;
}