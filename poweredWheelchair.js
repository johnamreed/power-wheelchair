// Import the needed libraries of JSCAD
const jscad = require('@jscad/modeling')

// Create primitives, colors, utilities, etc. from modeling library
const { arc, star, circle, square, rectangle, polygon, triangle } = jscad.primitives // 2D primitives
const { cube, cuboid, roundedCuboid, torus, cylinder, roundedCylinder, sphere } = jscad.primitives // 3D primitives
const { rotate, rotateX, rotateZ, translate, translateY, translateZ, rotateY, mirrorX, mirrorY, translateX } = jscad.transforms // Transforms
const { union, subtract } = jscad.booleans // Boolean operations
const { hull } = jscad.hulls // Hull operations
const { extrudeLinear, extrudeRectangular } = jscad.extrusions // Extrusions
const { colorize, colorNameToRgb } = jscad.colors // Colors
const { degToRad } = jscad.utils // Utilities

// Define constants
const inToMm = 25.4; // Conversion from inches to millimeters
const segments = 32; // Number of segments per extrusion

const wheelThickness = 1.5; // (in.) wheel thickness
const wheelGap = 1.5; // (in.) gap between the driver wheels and the body of the wheelchair
const castorGap = 1; // (in.) distance between a wheel and its castor forks 

// BIG WHEEL REDO PARAMS:
const frontWheelOffset = 20; // inches, distance from the bight of the seat to the axle of the front wheels
const frontCastorForkAngle = 15; // degrees, angle of castors on front wheel

const pinchInAmmt = 3; // inches, amount of distance closer together the front wheels are than the driver wheels

const backWheelOffset = 15; // inches, distance from the bight of the seat to the axle of the back wheels
const backCastorForkAngle = 0; // degrees, angle of castors on back wheel

const clearance = 3; // inches, space between the body and the ground. 

const roundRadius = 1; // inch, amount of rounding to the seat
// TODO: rename this ^ to something better
const seatTaperAmmt = 2; // inch, difference between the front of the seat and the back

const frameSize = 1.5; // inches (length of one side of cross-sectionally square frame pieces
const frameBendRadius = 4; // inches (radius of the places where the frame does a 90 degree bend

const armRestWidth = 3; // inches
const controlPanelDepth = 5; // inches
const controlPanelAngle = 10; // degrees



// Function to define the parameters
function getParameterDefinitions() {
  // UNIT-INCLUDING CODE (don't delete)
  /* let units = [
    {name: 'units', type: 'radio', caption: 'Units:', values: [0, 1], captions: ['in', 'mm'], initial: 0},
  ]; // Units radio button (currently functionless)
  
  const paramInit = [16, 20, 4, 12]; // Initial values for parameters */

  // All parameters
  let parameters = [
    {name: 'coreParameters', type: 'group', initial: 'open', caption: 'Core Parameters' },
    // Seat Parameters
    {name: 'seatWidth', caption: 'Seat Width:', type: 'float', initial: 16},
    {name: 'seatHeight', caption: 'Seat Height (from Ground):', type: 'float', initial: 20},
    {name: 'seatBackHeight', caption: 'Seat Back Height:', type: 'float', initial: 20},
    {name: 'seatAngle', caption: 'Seat Angle (degrees):', type: 'float', initial: 0, min: 0, max: 15},
    {name: 'reclineAngle', caption: 'Recline Angle (degrees):', type: 'float', initial: 5, min: 0, max: 15},
    {name: 'hand', caption: 'Handedness:', type: 'radio', values: [0, 1], captions: ['L', 'R'], initial: 1}, 
    // {name: 'driverWheelOffset', caption: 'Driver Wheel Offset:', type: 'float', initial: 0, min: -5, max: 15},
    {name: 'driverWheelPos', caption: 'Driver Wheel Position', type: 'choice', values: [0, 1, 2], captions: ["Center Wheel Drive (CWD)", "Front Wheel Drive (FWD)", "Rear Wheel Drive (RWD)"]},

    // Wheel Parameters
    /* {name: 'backWheel', caption: 'Back Wheel:', type: 'choice', values: [0, 1, 2], captions: ['Small', 'Medium', 'None'], initial: 1},
    {name: 'frontWheel', caption: 'Front Wheel:', type: 'choice', values: [0, 1], captions: ['Small', 'Medium'], initial: 1},
    */
    
    // Other parameters
   
    {name: 'independentParameters', type: 'group', initial: 'closed', caption: 'Independent Parameters' },
    // Seat Parameters
    {name: 'seatThick', caption: 'Seat Thickness:', type: 'float', initial: 4 },
    // Wheel Parameters
    {name: 'largeWheelDiameter', caption: 'Driver Wheel Diameter:', type: 'float', initial: 12, min: 12, max: 14},
    {name: 'mediumWheelDiameter', caption: 'Medium Wheel Diameter:', type: 'float', initial: 7, min: 6, max: 8},
    {name: 'smallWheelDiameter', caption: 'Small Wheel Diameter:', type: 'float', initial: 3, min: 2, max: 5},
    {name: 'legRestAngle', caption: 'Leg Rest Angle:', type: 'float', initial: 5, min: 0, max: 15},
    
  ];
  
  return parameters;
  
  // UNIT-INCLUDING CODE (don't delete)
  /* let allParameters = units.concat(parameters);
  
  return allParameters;*/
}


// Helper function to convert parameters in inches to millimeters
function toMm(num) {
  return num * inToMm;
}



/* WHEELS */

// Creates a simple wheel for the wheelchair, with the given diameter
function simpleWheel(diameter) {
  // Figure out the radius of the wheel
  const radius = toMm(diameter/2);
  
  // Create the tire as a hollow cylinder
  let tire = subtract(cylinder({radius, height: toMm(wheelThickness), segments}),
                      cylinder({radius: radius * 3/4, height: toMm(wheelThickness), segments})
  );
  // Create the hub of the wheel as a smaller cylinder
  let hub = cylinder({radius, height: toMm(wheelThickness / 4)});
  
  // Flip the parts so they're vertical and return
  return rotateY(degToRad(90), union(hub, tire));
  
} // wheel()


// Creates a pair of driver wheels and positions them correctly
function createDriverWheels(params) {
  let wheels = union(translateX(-toMm(params.seatWidth/2), simpleWheel(params.largeWheelDiameter)), 
                     translateX(toMm(params.seatWidth/2), simpleWheel(params.largeWheelDiameter))
               );
  return translateZ(toMm(params.largeWheelDiameter/2), wheels);
} // createDriverWheels()


// Helper function to create the smaller front and back wheels of the wheel chair (2 types)
function makeCastorWheel(params, type, angle) {
  
  let wheel;
  
  const radius = (type == 'medium') ? toMm(params.mediumWheelDiameter/2) : toMm(params.smallWheelDiameter/2);
  const castorWidth = (type == 'medium') ? toMm(1.2 * wheelThickness + 0.2) : toMm(wheelThickness + 0.2);
  const castorHeight = radius + toMm(castorGap);
  
  if (type == 'medium') { // Create a "medium" wheel
    
    // "Axle" -- where the castor will connect to the wheel
    let axle = rotateY(degToRad(90), cylinder({radius: radius/8, height: castorWidth, segments}));
    
    // Combine this axle with a simple wheel
    wheel = union(simpleWheel(params.mediumWheelDiameter), axle);
  
  } else if (type == 'small') { // Otherwise, create a "small" wheel
    
    // The small size of wheel is one solid piece
    wheel = roundedCylinder({radius, height: toMm(wheelThickness), roundRadius: radius/5, segments});
            
    wheel = rotateY(degToRad(90), wheel);
            
  }
  
  
  // Create castor top
  let castorTop = cuboid({size: [castorWidth, castorWidth, toMm(0.2)]});
  // Create castor "sides" (the parts that grab the center of the wheel
  let castorSide = rotateY(degToRad(270), extrudeLinear( {height: toMm(0.2)}, hull(circle({radius: castorWidth/2}), square({size: castorWidth, center: [castorHeight - castorWidth/2, 0]}) )));
  
  // Construct castor
  let castor = union(translateZ(castorHeight, castorTop),
                     translate([castorWidth/2, 0, 0], castorSide),
                     translate([-(castorWidth/2 - toMm(0.2)), 0, 0], castorSide)
  );
  
  // Rotate the castor to the given angle from vertical
  castor = rotateX(degToRad(angle), castor);
  
  // Translate up so base of wheel sits on the ground
  return translateZ(radius, union(wheel, castor));
 
} // makeCastorWheel()

/* BASE */

/* function legRest(params) {

  // Create 2D shape of leg rest, and extrude
  let base = hull(circle({radius: toMm(1), center: [-toMm(params.seatWidth * 0.25 - 0.5), 0]}),
                  circle({radius: toMm(1), center: [toMm(params.seatWidth * 0.25 - 0.5), 0]}),
                  circle({radius: toMm(3.5), center: [-toMm(params.seatWidth * 0.25 - 1.5), toMm(6)]}),
                  circle({radius: toMm(3.5), center: [toMm(params.seatWidth * 0.25 - 1.5), toMm(6)]})
  );
  
  
  
  let rest = rotateX(degToRad(params.legRestAngle), extrudeLinear({height: toMm(0.4)}, base));
  // Make a thingy to attach leg rest to body
  let connector = cuboid({size: [toMm(params.seatWidth * 0.25 - 0.5), toMm(params.seatWidth * 0.25 - 0.5), toMm(1)], center: [0, -toMm(params.seatWidth * 0.25 - 1)/2, 0]});
  return union(rest, connector);
}
*/

// Creates the front wheel part of the base
function frontWheelFrame(params) {
  // Create two wheels, place appropriately
  let XOffset = toMm(params.seatWidth - pinchInAmmt)/2;
  let type = 'small';
  let wheel = makeCastorWheel(params, type, frontCastorForkAngle);
  // Place the wheels correctly
  let wheels = union(translateX(XOffset, wheel), translateX(-XOffset, wheel));
  
  
  return wheels; 
}

// Creates the back wheel part of the base
function backWheelFrame(params) {
  // Create two wheels
  let width = toMm(params.seatWidth - pinchInAmmt);
  let type = 'medium';
  let wheel = makeCastorWheel(params, type, -backCastorForkAngle);
  // Place the wheels correctly
  let wheels = union(translateX(width/2, wheel), translateX(-width/2, wheel));
  
  // Create a frame to hold the back two wheels
  let radius = (type == 'medium') ? params.mediumWheelDiameter/2 : params.smallWheelDiameter/2;
  let height = toMm(radius + (Math.cos(degToRad(backCastorForkAngle)) * (radius + wheelGap))  + 0.3);
 
  /* let size = [width + toMm(wheelThickness), toMm(wheelThickness), toMm(wheelThickness)];
  let straightBar = translateZ(height, cuboid({size})); */
  
  // 
  let angle = 30; // degrees
  let size = [width/3 * Math.cos(degToRad(angle)) + toMm(wheelThickness * 0.9), toMm(wheelThickness), toMm(wheelThickness)];
  let slantBar = translate([-width/3 * Math.cos(degToRad(angle)), width/6 * Math.sin(degToRad(angle)),0], rotateZ(degToRad(angle), cuboid({size})));
  
  size = [width/3, toMm(wheelThickness), toMm(wheelThickness)];
  let straightBar = translate([0, width/3 * Math.sin(degToRad(angle)), 0], cuboid({size}));
  
  
  let castorCap = translateX(-width/2, cube({size: toMm(wheelThickness + 0.4)}));
                       
  let barFrame = translateZ(height, union(slantBar, mirrorX(slantBar), straightBar, castorCap, mirrorX(castorCap)));
  
  return union(wheels, barFrame);
  
}


// Creates the base of the wheelchair
function createBase(params, seatDepth, baseDepth) {
  
  let frontFrame = translateY(toMm(frontWheelOffset), frontWheelFrame(params));
  let backFrame = translateY(toMm(-backWheelOffset), backWheelFrame(params));
  
  // Translate the whole thing according to driver wheel offset
  return translateY(toMm(-params.driverWheelOffset), union(frontFrame, backFrame));

 /*
  let size = [toMm(params.seatWidth - 2 * wheelGap), toMm(baseDepth), toMm(params.largeWheelDiameter - clearance)];
  let center = [0, 0, size[2]/2 + toMm(clearance)]
  let base = cuboid({size, center});
  return base; */

}


/* SEAT */

// Creates the seat cushion of the chair
function seatCushion(params, seatDepth, backSeatWidth) {
  let radius = toMm(roundRadius); 
  // Define the coordinates of the edges of the seat, accounting for curvature
  // const x = toMm(params.seatWidth/2 - roundRadius);
  // const y = toMm(seatDepth/2 - roundRadius);
  // Create a 2D base to be extruded
  let base = hull(circle({radius, center: [toMm(params.seatWidth/2 - roundRadius), toMm(seatDepth/2 - roundRadius)]}),
                  circle({radius, center: [-toMm(params.seatWidth/2 - roundRadius), toMm(seatDepth/2 - roundRadius)]}),
                  circle({radius, center: [toMm(backSeatWidth/2 - roundRadius), -toMm(seatDepth/2 - roundRadius)]}),
                  circle({radius, center: [-toMm(backSeatWidth/2 - roundRadius), -toMm(seatDepth/2 - roundRadius)]})
  );
  // Extrude to the thickness of the seat
  return extrudeLinear({height: toMm(params.seatThick)}, base);
} 

// Creates the seat back of the chair
function seatBack(params, backSeatWidth) {
  const radius = toMm(roundRadius);
  let base = hull(circle({radius, center: [-toMm(backSeatWidth/2 * 0.85  - roundRadius), 0]}), // Bottom corners
                  circle({radius, center: [toMm(backSeatWidth/2 * 0.85  - roundRadius), 0]}),  // "
                  circle({radius, center: [-toMm(backSeatWidth/2  - roundRadius), toMm(params.seatBackHeight * 0.25)]}), // Middle "corners"
                  circle({radius, center: [toMm(backSeatWidth/2  - roundRadius), toMm(params.seatBackHeight * 0.25)]}),  // "
                  circle({radius, center: [-toMm(backSeatWidth/2 * 0.65  - roundRadius), toMm(params.seatBackHeight)]}), // Top corners
                  circle({radius, center: [toMm(backSeatWidth/2 * 0.65 - roundRadius), toMm(params.seatBackHeight)]})    // "
  );
  let seatBack = extrudeLinear({height: toMm(params.seatThick)}, base);
  
  return seatBack;
}

// Creates the armrests of the chair
function armRests(params, seatDepth, armRestDepth) {
  // Create armrests
  let size = [toMm(armRestWidth), toMm(armRestDepth), toMm(frameSize)];
  let leftArmRest = translate([-toMm(params.seatWidth/2 + armRestWidth/2), -toMm(armRestDepth/2 ), 0], cuboid({size}));
  let rightArmRest = translateX(toMm(params.seatWidth + armRestWidth), leftArmRest);
  
  // Create the control panel
  size = [toMm(armRestWidth), toMm(controlPanelDepth), toMm(frameSize * 0.75)];
  let controlPanel = rotateX(degToRad(controlPanelAngle), cuboid({size}));
  let joyStick = union(cylinder({radius: toMm(0.5), height: toMm(2.5), center: [0, 0, toMm(2.5/2)]}),
                       sphere({radius: toMm(1.15), center: [0, 0, toMm(2.5)], segments: 16}));
  let controls = union(controlPanel, joyStick);
  
  let xOffset = params.hand == 1 ? toMm(params.seatWidth/2 + armRestWidth/2) : -toMm(params.seatWidth/2 + armRestWidth/2);
  controls = translate([xOffset, toMm(controlPanelDepth * 0.45), toMm(frameSize*0.45)], controls);
  
  // Add control stick depending on handedness
   return union(leftArmRest, rightArmRest, controls);
}

function seatFrame(params, seatDepth, armRestHeight) {
  // TODO: somehow make these bended sections of framing work
  
  // Centered on bar at back of seat
  let size = [toMm(params.seatWidth + 2 * frameSize), toMm(frameSize), toMm(frameSize)];
  let backHoriz = cuboid({size});
  
  // Another bar for just in front of the support pillar thing
  size = [toMm(params.seatWidth * 0.8), toMm(frameSize), toMm(frameSize)];
  let frontHoriz = translateY(toMm(params.seatWidth * 0.8), cuboid({size}));
  
  // Connect the two existing bars
  size = [toMm(frameSize), toMm(params.seatWidth * 0.8), toMm(frameSize)];
  let leftConnect = translate([toMm(params.seatWidth * 0.4 - frameSize/2), toMm(params.seatWidth * 0.4), 0], cuboid({size}));
  let rightConnect = translateX(-toMm(params.seatWidth * 0.8 - frameSize), leftConnect);
  
  // Create the arm rest frames
  size = [toMm(frameSize), toMm(frameSize), toMm(armRestHeight)];
  let leftVert = translate([toMm(params.seatWidth/2 + frameSize/2), 0, toMm(armRestHeight/2)], cuboid({size}));
  let rightVert = translateX(-toMm(params.seatWidth + frameSize), leftVert);
  
  return union(frontHoriz, backHoriz, leftConnect, rightConnect, leftVert, rightVert);
  
}

// Using helper functions above, create and position the chair of the wheelchair
function createChair(params, seatDepth, backSeatWidth, armRestHeight, armRestDepth) {
  // Create the seat back, and apply the recline angle
  let back = translate([0, toMm(-seatDepth/2), toMm(params.seatThick/2)], rotateX(degToRad(90 + params.reclineAngle), seatBack(params, backSeatWidth)));
  let cushion = seatCushion(params, seatDepth, backSeatWidth);
  let frame = translate([0, -toMm(seatDepth/2 + frameSize), -toMm(frameSize/2)], seatFrame(params, seatDepth, armRestHeight));
  let armRest = translateZ(toMm(armRestHeight), armRests(params, seatDepth, armRestDepth));
  
  // Apply the seat angle rotation
  let YOffset = toMm(seatDepth/2) - 100 + (100 * Math.tan(degToRad(params.reclineAngle/2)));
  let ZOffset = -(100 + toMm(params.seatThick));
  let chair = rotateX(degToRad(params.seatAngle), translate([0, YOffset, ZOffset], [frame, back, cushion, armRest]));
  // let chair = rotateX(degToRad(params.seatAngle), [frame, back, cushion, armRest]);
  
  // Position the chair vertically
  chair = translate([0, -YOffset + toMm(seatDepth/2), -ZOffset + toMm(params.seatHeight)], chair);
  
  return chair;
}


// Calculates the correct offset to move all other elements so the driver wheel is positioned correctly
function calculateOffset(params) {
  switch(params.driverWheelPos) {
    case 0:
      return -(toMm(params.seatWidth/2) - toMm(1));
    case 1:
      return -(toMm(params.seatWidth) - toMm(3));
    case 2:
      return 0;
  }
} // calculateOffset()



function main(params) {

  // Dependent parameters
  const seatDepth = params.seatWidth;
  const baseDepth = seatDepth * 1.5;
  const armRestHeight = params.seatBackHeight * 0.5; // TODO: change to be in relation to back rest height
  const armRestDepth = params.seatWidth * 0.5 + 2 * frameSize;
  const backSeatWidth = params.seatWidth - seatTaperAmmt; // The width of the seat at the back side
  
  let chair = colorize(colorNameToRgb('lightgrey'), createChair(params, seatDepth, backSeatWidth, armRestHeight, armRestDepth));
  let base = colorize(colorNameToRgb('lightgrey'), createBase(params, seatDepth, baseDepth));
  
  // Adjust the chair and the base to account for the driver wheel position
  let offset = calculateOffset(params);
  
  chair = translateY(offset, chair);
  base = translateY(offset, base);
  
  let driverWheels = colorize(colorNameToRgb('lightgreen'), createDriverWheels(params));
  
  // DEBUG: x axis and xy plane to tell that the wheelchair stays grounded
  let xaxis = cuboid({size: [toMm(100), 1, 1]});
  let xyplane = cuboid({size: [toMm(100), toMm(100), 1]});
  
  return [chair, base, driverWheels];
}

// Export the model and parameters to display on the screen
module.exports = { main, getParameterDefinitions }
