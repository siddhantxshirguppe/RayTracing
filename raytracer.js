var scene = null;
var maxDepth = 5;
var slider_depth = 0;
var background_color = [190/255, 210/255, 215/255];
var ambientToggle = false;
var diffuseToggle = false;
var specularToggle = false;
var reflectionToggle =false;
var bias = 0.001;

class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }
}

class Intersection {
    constructor(distance, point) {
        this.distance = distance;
        this.point = point;
    }
}

class Hit {
    constructor(intersection, object) {
        this.intersection = intersection;
        this.object = object;
    }
}

/*
    Intersect objects
*/
function raySphereIntersection(ray, sphere) {
    var center = sphere.center;
    var radius = sphere.radius;

    var A = dot(ray.direction, ray.direction);
    var B = dot( mult(ray.direction, 2),  sub(ray.origin, center) );
    var C = dot(sub(ray.origin, center), sub(ray.origin, center)) - (radius*radius);
    

    var discriminant = (B * B) - (4 * A * C);

    if( discriminant > 0 )
    {
        var t = (-B - Math.sqrt(discriminant)) / (2 * A);

        var intersectionPoint = add(ray.origin, mult(ray.direction, t));

        return new Intersection(t, intersectionPoint);
    }else
    {
        return null;
    }

    // Compute intersection

    // If there is a intersection, return a new Intersection object with the distance and intersection point:
    // E.g., return new Intersection(t, point);

    // If no intersection, return null
}

function rayPlaneIntersection(ray, plane) {

    var center = plane.center;
    var normal = plane.normal;
    // Compute intersection

    var denom = dot(normal, ray.direction);
    if(denom === 0)
    {
        return null;
    }
    else{
        var t =  dot(sub(plane.center, ray.origin), plane.normal) / (dot(plane.normal,ray.direction));

        var intersectionPoint = add(ray.origin, mult(ray.direction, t));
        return new Intersection(t, intersectionPoint);
    }
    // If there is a intersection, return a dictionary with the distance and intersection point:
    // E.g., return new Intersection(t, point);

    // If no intersection, return null

}

function intersectObjects(ray, depth) {

    //console.log("sidobj ray origin:"+ray.origin+"dir:"+ray.direction+"obj count:"+scene.objects.length);
    if(depth === 0)
    {
        var closestHit = null;
        for (var i = 0; i < scene.objects.length; i++) {
            var object = scene.objects[i];
            //console.log("sidobj iterating through obj:"+object.type);
            var intersection;
    
            if (object.type === "sphere") {
                intersection = raySphereIntersection(ray, object);
            }else if(object.type === "plane") {
                intersection = rayPlaneIntersection(ray, object);
            }
            if(intersection && (intersection.distance > 0) && !closestHit)
            {
                closestHit = new Hit(intersection, object);
            }
    
            if (intersection && (intersection.distance > 0) && ( intersection.distance < closestHit.intersection.distance)) {
                closestHit = new Hit(intersection, object);
            }
    
        }
    
        return closestHit;
    }else
    {
        var hit_point = intersectObjects(ray, 0);
        if(hit_point === null)
        {
            return null;
        }

        var obj_normal;
        if(hit_point.object.type === "plane")
        {
            obj_normal = hit_point.object.normal;
        }else if(hit_point.object.type === "sphere")
        {
            obj_normal = sphereNormal(hit_point.object, hit_point.intersection.point);
        }
        //get the reflected ray direction 
        var reflected_ray_dir = normalize(sub(ray.direction ,mult(obj_normal,2*dot(ray.direction,obj_normal))));


        var intersect_pos_nudged = add(hit_point.intersection.point,mult(reflected_ray_dir,bias));
        var reflected_ray = new Ray(intersect_pos_nudged, reflected_ray_dir);
        
        var hit = intersectObjects(reflected_ray, depth-1);
        if(hit != null)
        {
            return hit;
    
        }else
        {
            return null;
        }

    }


    // Loop through all objects, compute their intersection (based on object type and calling the previous two functions)
    // Return a new Hit object, with the closest intersection and closest object

    // If no hit, retur null

}

function sphereNormal(sphere, pos) {
    // Return sphere normal
    var normal_sphere = sub(pos, sphere.center);
    var unit_normal = normalize(normal_sphere);
    return unit_normal;

}

/*
    Shade surface
*/
function shade(ray, hit, depth) {

    var color = [0,0,0];

    var object = hit.object;
    
    if(object.type === "sphere")
    {
  

        //get the sphere normal at the point 
        var total_diffuse_intensity = 0;
        var total_specular_intensity = 0;
        var sphere_normal = sphereNormal(hit.object, hit.intersection.point);

        for (var i = 0; i < scene.lights.length; i++) 
        {
            var light = scene.lights[i].position;
            //console.log("sidlight:"+light);
            var intersection_light_dir =  normalize(sub(light, hit.intersection.point));
            var diffuse_pdt = dot(sphere_normal, intersection_light_dir);
            if (diffuse_pdt < 0) {
                diffuse_pdt = 0;
            }

            total_diffuse_intensity += diffuse_pdt; 


            //specular calculation

            var light = scene.lights[i].position;
            //console.log("sidlight:"+light);
            var intersection_cam_dir =  normalize(sub(scene.camera.position, hit.intersection.point));
            var half_vector = normalize(add(intersection_cam_dir,intersection_light_dir));

            var specular_pdt = dot(sphere_normal, half_vector);
            if (specular_pdt < 0) {
                specular_pdt = 0;
            }

            //specular_pdt = Math.pow(specular_pdt, specular_factor);
            specular_pdt =  Math.pow(specular_pdt, object.specularExponent);
            total_specular_intensity += specular_pdt; 

        }

        var final_ambient_color = mult(object.color, object.ambientK);
        var final_diffuse_color = mult(object.color, total_diffuse_intensity*object.diffuseK);
        var final_specular_color = mult([255,255,255], total_specular_intensity);
        

        //check if it lies in shadow
        var in_shadow = false;
        for (var i = 0; i < scene.lights.length; i++) 
        {
            var in_shadow =  isInShadow(hit, scene.lights[i]);

            if(in_shadow)
            {
                final_diffuse_color = mult(final_diffuse_color, 0.2);
                final_specular_color = mult(final_specular_color, 0.2);
            }
        }
        
       
        if(ambientToggle)
        {
            color = final_ambient_color;
        }
        if(diffuseToggle)
        {
            color = add(color,final_diffuse_color);
        }
        if(specularToggle)
        {
            //console.log("sidtest specular!!");
            color = add(color,final_specular_color);
        }


    }else if(object.type === "plane")
    {
        var total_diffuse_intensity = 0;
        var total_specular_intensity = 0;
        var plane_normal = hit.object.normal;

        for (var i = 0; i < scene.lights.length; i++) 
        {
            //get the direction from intersection point to the light source 
            var light = scene.lights[i].position;
            //console.log("sidlight:"+light);
            var intersection_light_dir =  normalize(sub(light, hit.intersection.point));
            var diffuse_pdt = dot(plane_normal, intersection_light_dir);
            if (diffuse_pdt < 0) {
                diffuse_pdt = 0;
            }

            total_diffuse_intensity += diffuse_pdt; 
        }

        var ambient_coefficient = 0.05;
        var final_diffuse_color = mult(object.color, total_diffuse_intensity);
        var final_ambient_color = mult(object.color, ambient_coefficient);
        var final_specular_color = mult([255,255,255], total_specular_intensity);

        //check if it lies in shadow
        //var in_shadow = false;
        for (var i = 0; i < scene.lights.length; i++) 
        {
            var in_shadow =  isInShadow(hit, scene.lights[i]);

            if(in_shadow)
            {
                final_diffuse_color = mult(final_diffuse_color, 0.2);
                final_specular_color = mult(final_specular_color, 0.2);
            }
        }
        

        
        if(ambientToggle)
        {
            color = final_ambient_color;
        }
        if(diffuseToggle)
        {
            color = add(color,final_diffuse_color);
        }
        if(specularToggle)
        {
            color = add(color,final_specular_color);
        }
        
    }


    //check if the pixel lies in shadow


    return color;
}


/*
    Trace ray
*/
function trace(ray, depth) {
    if(depth > maxDepth) return background_color;

    var final_color = null;
    // Loop through each depth level
    for (var currentDepth = 0; currentDepth <= depth; currentDepth++) {

        var hit = intersectObjects(ray, currentDepth);
        if (hit != null) {
            var color = shade(ray, hit, currentDepth);
            if(final_color)
            {
                color = mult(color, hit.object.reflectiveK);
                final_color = add (final_color,color);
            }else{
                final_color = color;
            }
        }
    }

    return final_color;;
}

function get_reflected_color(reflected_ray_dir,intersection_pos,depth)
{
    var intersect_pos_nudged = add(intersection_pos,mult(reflected_ray_dir,bias));
    var reflected_ray = new Ray(intersect_pos_nudged, reflected_ray_dir);
    
    var hit = intersectObjects(reflected_ray, depth);
    if(hit != null)
    {
        return hit.object.color;

    }else
    {
        return null;
    }
}
function isInShadow(hit, light) {

    var light_pos = light.position;
    var intersect_pos = hit.intersection.point;

    var light_vector = normalize(sub(light_pos,intersect_pos));
    var intersect_pos_nudged = add(intersect_pos,mult(light_vector,bias));
    var light_ray = new Ray(intersect_pos_nudged, light_vector);
    
    var hit = intersectObjects(light_ray, 0);

    if(hit != null)
    {
        var light_dist = length(sub(light_pos,intersect_pos));
        var hit_dist = hit.intersection.distance;
        if(hit_dist < light_dist )
        {
            console.log("light_dist:"+light_dist);
            console.log("hit_dist:"+hit_dist);
            return true;
        }else{
            return false;
        }

    }else
    {
        return false;
    }

    // Check if there is an intersection between the hit.intersection.point point and the light
    // If so, return true
    // If not, return false

}

/*
    Render loop
*/
function render(element) {
    if(scene == null)
        return;
    
    var width = element.clientWidth;
    var height = element.clientHeight;
    element.width = width;
    element.height = height;
    scene.camera.width = width;
    scene.camera.height = height;

    var ctx = element.getContext("2d");
    var data = ctx.getImageData(0, 0, width, height);

    var eye = normalize(sub(scene.camera.direction,scene.camera.position));
    var right = normalize(cross(eye, [0,1,0]));
    var up = normalize(cross(right, eye));
    var fov = ((scene.camera.fov / 2.0) * Math.PI / 180.0);

    var halfWidth = Math.tan(fov);
    var halfHeight = (scene.camera.height / scene.camera.width) * halfWidth;
    var pixelWidth = (halfWidth * 2) / (scene.camera.width - 1);
    var pixelHeight = (halfHeight * 2) / (scene.camera.height - 1);

    if(ambientToggle)
    {
        console.log("sidtest ambient!!");

    }
    if(diffuseToggle)
    {
         console.log("sidtest diffuse!!");
    }
    if(specularToggle)
    {
        console.log("sidtest diffuse!!");
    }

    for(var x=0; x < width; x++) {
        for(var y=0; y < height; y++) {
            if(x%50 === 0 && y%50 ===0)
            {
                console.log("sidtrace pos x:"+x+"y:"+y);
            }
            
            var vx = mult(right, x*pixelWidth - halfWidth);
            var vy = mult(up, y*pixelHeight - halfHeight);
            var direction = normalize(add(add(eye,vx),vy));
            var origin = scene.camera.position;

            var ray = new Ray(origin, direction);
            
            if(reflectionToggle)
            {
                if(slider_depth ===0)
                {
                    slider_depth = 1;
                }
            }else{
                slider_depth = 0;
            }
            var color = trace(ray, slider_depth);
            //var color = [255,0,0,255];
            if(color != null) {
                var index = x * 4 + y * width * 4;
                data.data[index + 0] = color[0];
                data.data[index + 1] = color[1];
                data.data[index + 2] = color[2];
                data.data[index + 3] = 255;
            }
        }
    }
    console.log("done");
    ctx.putImageData(data, 0, 0);
}

/*
    Handlers
*/
window.handleFile = function(e) {
    var reader = new FileReader();
    reader.onload = function(evt) {
        var parsed = JSON.parse(evt.target.result);
        scene = parsed;
    }
    reader.readAsText(e.files[0]);
}

window.updateMaxDepth = function() {
    slider_depth = document.querySelector("#maxDepth").value;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleAmbient = function() {
    ambientToggle = document.querySelector("#ambient").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleDiffuse = function() {
    diffuseToggle = document.querySelector("#diffuse").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleSpecular = function() {
    specularToggle = document.querySelector("#specular").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

window.toggleReflection = function() {
    reflectionToggle = document.querySelector("#reflection").checked;
    var element = document.querySelector("#canvas");
    render(element);
}

/*
    Render scene
*/
window.renderScene = function(e) {
    var element = document.querySelector("#canvas");
    render(element);
}