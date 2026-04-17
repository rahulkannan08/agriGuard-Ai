# AgriVision UI Implementation Prompt

## Goal
Create a frontend web interface for an agricultural AI system focused on leaf disease detection and real-time interaction using Next.js, React, Tailwind CSS, and Lucide Icons.

## Expected Pages and Components

1. **Authentication Pages (Sign In & Sign Up)**
   - Minimalist, modern form for users to enter credentials.
   - Once authenticated, it navigates to the dashboard/main page.

2. **Dashboard Layout (After Login)**
   - **Top Left (Hamburger Menu):** 
     - Toggles a sidebar menu containing:
       - Check New Leaf
       - History
       - Map
       - Light/Dark Mode Toggle
   - **Top Right (Profile):**
     - Profile button that drops down or opens a modal to show User Name and Role (e.g., Farmer / Agronomist).

3. **Main Dashboard / Action Area**
   - **Image Upload:** A drag-and-drop or file selection area to upload an image of a leaf.
   - **Live AI Interaction:** An option specifically stating "Talk with LiveKit Model" to allow realtime voice/text interaction about the crops.

4. **Results / Details View**
   - Shown after uploading the leaf image.
   - Displays the analyzed image.
   - Shows necessary details about the leaf, the specific disease detected, confidence score, and treatment instructions.

## Tech Stack
- React / Next.js (App Router or Pages Router)
- Tailwind CSS (for styling and light/dark mode)
- framer-motion (for smooth animations)
- lucide-react (for icons)

## Implementation Steps
1. Setup global layout with Header & Sidebar.
2. Build Auth Views (state-based or separate routes).
3. Build the core Dashboard view.
4. Integrate the Image Uploader component.
5. Stub out the LiveKit integration button.
6. Create the result view layout for after an upload is processed.
