import { SimpleFocusPlugin } from "../main";

/**
 * Find or create the navigation buttons container in the file explorer view.
 * Tries multiple selectors to support both desktop and mobile.
 * On mobile, creates a container if none exists.
 */
export function findNavButtonsContainer(fileExplorerView: HTMLElement): HTMLElement | null {
	// Try desktop selector first
	let container = fileExplorerView.querySelector('.nav-buttons-container') as HTMLElement;
	if (container) {
		return container;
	}

	// Try alternative selectors for mobile
	// Mobile might have the buttons in a different structure
	container = fileExplorerView.querySelector('.nav-header-button-container') as HTMLElement;
	if (container) {
		return container;
	}

	// Try finding by looking for existing nav-action-button elements
	const existingButtons = fileExplorerView.querySelectorAll('.nav-action-button');
	if (existingButtons.length > 0) {
		const firstButton = existingButtons[0];
		const parent = firstButton.parentElement;
		if (parent && (parent.classList.contains('nav-buttons-container') || 
		               parent.classList.contains('nav-header-button-container') ||
		               Array.from(parent.children).some(el => el.classList.contains('nav-action-button')))) {
			return parent as HTMLElement;
		}
	}

	// Try finding the view header and appending to it
	const viewHeader = fileExplorerView.querySelector('.view-header') as HTMLElement;
	if (viewHeader) {
		// Look for any container with nav buttons inside the header
		const headerContainer = viewHeader.querySelector('.nav-buttons-container') as HTMLElement ||
		                       viewHeader.querySelector('.nav-header-button-container') as HTMLElement ||
		                       viewHeader.querySelector('.view-header-title-container') as HTMLElement;
		if (headerContainer) {
			return headerContainer;
		}
		// If no container found, return the header itself as fallback
		return viewHeader;
	}

	// Mobile fallback: Look for nav-files-container and create a button bar above it
	const navFilesContainer = fileExplorerView.querySelector('.nav-files-container') as HTMLElement;
	if (navFilesContainer) {
		// Check if we already created a mobile button container
		let mobileButtonContainer = fileExplorerView.querySelector('.simple-focus-mobile-buttons') as HTMLElement;
		if (!mobileButtonContainer) {
			// Create a mobile button container
			mobileButtonContainer = document.createElement('div');
			mobileButtonContainer.className = 'nav-buttons-container simple-focus-mobile-buttons';
			mobileButtonContainer.style.display = 'flex';
			mobileButtonContainer.style.alignItems = 'center';
			mobileButtonContainer.style.gap = '4px';
			mobileButtonContainer.style.padding = '8px';
			mobileButtonContainer.style.borderBottom = '1px solid var(--background-modifier-border)';
			
			// Insert it before the nav-files-container
			navFilesContainer.parentElement?.insertBefore(mobileButtonContainer, navFilesContainer);
		}
		return mobileButtonContainer;
	}

	// Last resort: create a container at the top of the view
	let topContainer = fileExplorerView.querySelector('.simple-focus-mobile-buttons') as HTMLElement;
	if (!topContainer) {
		topContainer = document.createElement('div');
		topContainer.className = 'nav-buttons-container simple-focus-mobile-buttons';
		topContainer.style.display = 'flex';
		topContainer.style.alignItems = 'center';
		topContainer.style.gap = '4px';
		topContainer.style.padding = '8px';
		topContainer.style.borderBottom = '1px solid var(--background-modifier-border)';
		
		// Insert at the beginning of the view
		fileExplorerView.insertBefore(topContainer, fileExplorerView.firstChild);
	}
	return topContainer;
}

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
	// Don't insert if already in the container
	if (navButtonsContainer.contains(icon)) {
		return;
	}

	// Find the position to insert: after all default Obsidian icons, before any .cmdr elements
	const allIcons = Array.from(navButtonsContainer.querySelectorAll('.clickable-icon.nav-action-button'));
	const defaultIcons = allIcons.filter(el => !el.classList.contains('cmdr') && el !== icon);
	const cmdrIcons = Array.from(navButtonsContainer.querySelectorAll('.cmdr'));
	
	if (cmdrIcons.length > 0) {
		// Insert before first cmdr icon
		navButtonsContainer.insertBefore(icon, cmdrIcons[0]);
	} else if (defaultIcons.length > 0) {
		// Insert after last default icon
		const lastIcon = defaultIcons[defaultIcons.length - 1];
		if (lastIcon.nextSibling) {
			navButtonsContainer.insertBefore(icon, lastIcon.nextSibling);
		} else {
			navButtonsContainer.appendChild(icon);
		}
	} else {
		// Just append if no other icons
		navButtonsContainer.appendChild(icon);
	}
}

