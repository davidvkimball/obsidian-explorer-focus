import { SimpleFocusPlugin } from "../main";

export function createFileExplorerIcon(plugin: SimpleFocusPlugin): HTMLElement {
	const icon = document.createElement('div');
	icon.className = 'clickable-icon nav-action-button';
	icon.setAttribute('aria-label', plugin.lang.toggleFocus);

	// Create the focus icon SVG
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	svg.setAttribute('width', '24');
	svg.setAttribute('height', '24');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	svg.setAttribute('class', 'svg-icon lucide-focus');
	
	// Lucide focus icon - circle with corner brackets
	const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	circle.setAttribute('cx', '12');
	circle.setAttribute('cy', '12');
	circle.setAttribute('r', '3');
	svg.appendChild(circle);
	
	const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path1.setAttribute('d', 'M3 7V5a2 2 0 0 1 2-2h2');
	svg.appendChild(path1);
	
	const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path2.setAttribute('d', 'M17 3h2a2 2 0 0 1 2 2v2');
	svg.appendChild(path2);
	
	const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path3.setAttribute('d', 'M21 17v2a2 2 0 0 1-2 2h-2');
	svg.appendChild(path3);
	
	const path4 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path4.setAttribute('d', 'M7 21H5a2 2 0 0 1-2-2v-2');
	svg.appendChild(path4);
	
	icon.appendChild(svg);
	return icon;
}

export function insertFileExplorerIcon(icon: HTMLElement, navButtonsContainer: HTMLElement): void {
	// Find the position to insert: after all default Obsidian icons, before any .cmdr elements
	const allIcons = Array.from(navButtonsContainer.querySelectorAll('.clickable-icon.nav-action-button'));
	const defaultIcons = allIcons.filter(el => !el.classList.contains('cmdr') && el !== icon);
	const cmdrIcons = Array.from(navButtonsContainer.querySelectorAll('.cmdr'));
	
	if (cmdrIcons.length > 0) {
		// Insert before first cmdr icon
		navButtonsContainer.insertBefore(icon, cmdrIcons[0]);
	} else if (defaultIcons.length > 0) {
		// Insert after last default icon
		navButtonsContainer.insertBefore(icon, defaultIcons[defaultIcons.length - 1].nextSibling);
	} else {
		// Just append if no other icons
		navButtonsContainer.appendChild(icon);
	}
}

