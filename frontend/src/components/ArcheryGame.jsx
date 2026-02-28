import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Sky, Environment, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader, ArrowRight } from 'lucide-react';


// --- Arrow Component ---
function Arrow({ position, rotation, state }) {
  const meshRef = useRef();

  return (
    <group position={position} rotation={rotation}>
      {/* Shaft */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
        <meshStandardMaterial color="#333" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Tip (Flipped to point towards -Z, colored bright red) */}
      <mesh position={[0, 0, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.18, 8]} />
        <meshStandardMaterial color="#ff3333" metalness={0.5} roughness={0.3} emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      {/* Fletching (colored bright yellow) */}
      <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.01, 0.25, 0.25]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={1.2} />
      </mesh>

    </group>
  );
}

// --- Target Component ---
function TargetBoard() {
  return (
    <group position={[0, 1.5, -20]}> {/* Back to upright center */}
      {/* Outer Ring (White) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <cylinderGeometry args={[2, 2, 0.1, 32]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Black Ring */}
      <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.6, 1.6, 0.11, 32]} />
        <meshStandardMaterial color="#1a202c" />
      </mesh>
      {/* Blue Ring */}
      <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.12, 32]} />
        <meshStandardMaterial color="#3182ce" />
      </mesh>
      {/* Red Ring */}
      <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.13, 32]} />
        <meshStandardMaterial color="#e53e3e" />
      </mesh>
      {/* Bullseye (Yellow/Glowing) */}
      <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.14, 32]} />
        <meshStandardMaterial color="#ecc94b" emissive="#ecc94b" emissiveIntensity={0.8} />
      </mesh>

      
      {/* Stand Base */}
      <mesh position={[0, -2.5, 0.1]}>
        <boxGeometry args={[1, 0.2, 1]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      {/* Stand Pole */}
      <mesh position={[0, -1.25, 0.1]}>
        <boxGeometry args={[0.2, 2.5, 0.2]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
    </group>
  );
}

// --- Bow Component (Upright and Centered) ---
function Bow({ state }) {
  const group = useRef();
  const topStringRef = useRef();
  const bottomStringRef = useRef();
  const loadedArrowRef = useRef();
  
  useFrame((stateObj) => {
    // Subtle breathing/moving animation
    if (group.current) {
      group.current.position.y = 1.4 + Math.sin(stateObj.clock.elapsedTime) * 0.02;
      
      // Pull back animation if idle/paused
      if (state === 'idle' || state === 'paused') {
        group.current.position.z = 2.4;
      } else {
        group.current.position.z = 2.0;
      }
    }
    
    // Draw string calculation
    let pullZ = 0;
    if (state === 'intro') {
       // Animate pull back (0.0 to 1.5s), hold (1.5 to 1.8s), and release just before flying (1.8 to 2.0s)
       const elapsed = stateObj.clock.elapsedTime % 2; // Assuming ~2s intro phase
       if (elapsed < 1.5) {
         pullZ = THREE.MathUtils.lerp(0, 0.6, elapsed / 1.5);
       } else if (elapsed < 1.8) {
         pullZ = 0.6;
       } else {
         pullZ = THREE.MathUtils.lerp(0.6, 0, (elapsed - 1.8) / 0.2);
       }
    } else if (state === 'flying' || state === 'hit') {
       pullZ = 0; // Snap forward
    } else {
       pullZ = 0.6; // Idle/drawn (fully drawn when waiting/paused)
    }

    // Geometry math for the V-string (bow span is from y=-0.9 to y=0.9)
    const spanY = 0.9;
    const stringLength = Math.sqrt(spanY * spanY + pullZ * pullZ);
    // Angle formed by the pull
    const startAngle = Math.atan2(pullZ, spanY);

    if (topStringRef.current && bottomStringRef.current) {
       // Top string segment (from y=0.9 down to y=0, z=pullZ)
       topStringRef.current.scale.y = stringLength;
       topStringRef.current.position.set(0, spanY / 2, pullZ / 2);
       topStringRef.current.rotation.x = -startAngle;

       // Bottom string segment (from y=0 up to y=-0.9, z=pullZ)
       bottomStringRef.current.scale.y = stringLength;
       bottomStringRef.current.position.set(0, -spanY / 2, pullZ / 2);
       bottomStringRef.current.rotation.x = startAngle;
    }

    // Position the loaded arrow so its nock sits exactly at the pullZ vertex
    if (loadedArrowRef.current) {
       loadedArrowRef.current.position.z = pullZ - 0.5; // Offset because arrow center isn't exactly at nock
    }
  });

  return (
    <group ref={group} position={[0, 1.6, 2.5]}> 
      {/* Bow Structure (Inverted curve) */}
      <mesh rotation={[-Math.PI / 2, Math.PI / 2, 0]}>
        <torusGeometry args={[0.9, 0.03, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#4a90e2" metalness={0.6} roughness={0.2} emissive="#4a90e2" emissiveIntensity={0.2} />
      </mesh>
      
      {/* Dynamic V-Shaped Bowstring */}
      <mesh ref={topStringRef}>
        <cylinderGeometry args={[0.005, 0.005, 1, 8]} />
        <meshStandardMaterial color="white" transparent opacity={0.8} />
      </mesh>
      <mesh ref={bottomStringRef}>
        <cylinderGeometry args={[0.005, 0.005, 1, 8]} />
        <meshStandardMaterial color="white" transparent opacity={0.8} />
      </mesh>

      {/* Loaded arrow visible only before firing */}
      {(state === 'intro' || state === 'idle' || state === 'paused') && (
        <group ref={loadedArrowRef}>
          <Arrow position={[0, 0, 0]} rotation={[0, 0, 0]} state={'idle'} />
        </group>
      )}
    </group>
  );
}

// --- Stickman Component ---
function Stickman({ phase }) {
  const group = useRef();
  
  // Animation logic for drawing the bow
  useFrame((state) => {
    if (group.current) {
      const rightArm = group.current.getObjectByName('rightArm');
      const leftArm = group.current.getObjectByName('leftArm');
      
      if (phase === 'intro') {
        // Draw the bow animation
        const t = (Math.sin(state.clock.elapsedTime * 2) + 1) / 2;
        if (rightArm) rightArm.rotation.z = -Math.PI / 4 - (t * 0.5);
        if (leftArm) leftArm.rotation.z = Math.PI / 4;
      }
    }
  });

  return (
    <group ref={group} position={[0, 0, 3]}>
      {/* Head */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#1a202c" emissive="#00ffcc" emissiveIntensity={0.2} />
      </mesh>
      {/* Body */}
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshStandardMaterial color="#1a202c" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Arms */}
      <group name="leftArm" position={[-0.1, 1.6, 0]} rotation={[0, 0, Math.PI / 4]}>
        <mesh position={[-0.2, 0, 0]}>
           <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} rotation={[0, 0, Math.PI / 2]} />
           <meshStandardMaterial color="#1a202c" metalness={0.8} />
        </mesh>
      </group>
      <group name="rightArm" position={[0.1, 1.6, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <mesh position={[0.2, 0, 0]}>
           <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} rotation={[0, 0, Math.PI / 2]} />
           <meshStandardMaterial color="#1a202c" metalness={0.8} />
        </mesh>
      </group>
      {/* Legs */}
      <mesh position={[-0.15, 0.5, 0]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
        <meshStandardMaterial color="#1a202c" metalness={0.8} />
      </mesh>
      <mesh position={[0.15, 0.5, 0]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
        <meshStandardMaterial color="#1a202c" metalness={0.8} />
      </mesh>
    </group>
  );
}

// --- Game Logic Scene ---
function ArcheryScene({ shotState, wrongCount, currentQIndex, onImpact }) {
  const [arrowZ, setArrowZ] = useState(1.5);
  const [deviation, setDeviation] = useState({ x: 0, y: 0 });
  
  // Constants for trajectory
  const startZ = 1.5;
  const pausePoints = [-5, -10, -15]; // 3 Pauses for 3 questions
  const endZ = -19.9; 
  const speed = 0.5; // Fast burst speed

  useFrame((state, delta) => {
    // 1. Arrow Movement
    if (shotState === 'flying' || shotState === 'paused') {
      const currentSpeed = shotState === 'paused' ? speed * 0.005 : speed; // Extreme slow motion when paused
      const nextZ = arrowZ - currentSpeed;
      const pauseZ = pausePoints[currentQIndex]; // Will be undefined if currentQIndex >= 3
      
      // Hit checkpoint if flying
      if (shotState === 'flying' && pauseZ !== undefined && nextZ <= pauseZ && arrowZ > pauseZ) {
        setArrowZ(pauseZ);
        onImpact('paused'); 
      } else if (nextZ <= endZ) {
        setArrowZ(endZ);
        if (shotState === 'flying') onImpact('hit'); 
      } else {
        setArrowZ(nextZ);
      }
      
      // Deviation accumulates over the multiple bursts
      if (wrongCount > 0) {
        const progress = Math.max(0, (startZ - nextZ) / (startZ - endZ));
        // Dev is worse if wrongCount is higher
        const maxDevX = wrongCount === 3 ? 4 : wrongCount === 2 ? 1.5 : 0.4;
        const maxDevY = wrongCount === 3 ? -2 : wrongCount === 2 ? -0.8 : -0.2;
        
        // Use lerp/easing to smooth out the curve as wrongCount increases mid-flight
        setDeviation({ 
          x: state.camera ? THREE.MathUtils.lerp(deviation.x, maxDevX * progress, 0.1) : maxDevX * progress, 
          y: state.camera ? THREE.MathUtils.lerp(deviation.y, maxDevY * progress, 0.1) : maxDevY * progress
        });
      }
    }
    
    // 2. Camera Logic - Follow Arrow tightly
    if (state.camera) {
      if (shotState === 'intro') {
        const camPos = new THREE.Vector3(2, 2.5, 5);
        state.camera.position.lerp(camPos, 0.05);
        state.camera.lookAt(0, 1.5, 2);
      } else if (shotState === 'flying' || shotState === 'paused' || shotState === 'hit') {
        // Mounted right behind the arrow for a cool POV. Smooth lerp for transition.
        const targetPos = new THREE.Vector3(
          deviation.x, 
          1.7 + deviation.y, 
          arrowZ + 1.2
        );
        state.camera.position.lerp(targetPos, 0.15); // Smoother, slower lerp factor
        
        // Look ahead
        const targetLook = new THREE.Vector3(
          deviation.x * 2, 
          1.5 + deviation.y * 2, 
          arrowZ - 10
        );
        state.camera.lookAt(targetLook);
      } else {
        state.camera.position.lerp(new THREE.Vector3(1, 2, 7), 0.1);
        state.camera.lookAt(0, 1.5, 1);
      }
    }

    if (shotState === 'idle' && arrowZ !== startZ) {
      setArrowZ(startZ);
      setDeviation({ x: 0, y: 0 });
    }
  });

  const pitch = (shotState === 'flying' || shotState === 'paused' || shotState === 'hit') ? -0.08 * ((startZ - arrowZ) / 20) : 0;
  const yaw = (shotState === 'flying' || shotState === 'paused' || shotState === 'hit') ? -0.06 * (deviation.x) : 0;

  return (
    <>
      <Sky sunPosition={[100, -5, 100]} turbidity={10} rayleigh={2} mieCoefficient={0.005} mieDirectionalG={0.8} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.5} color="#fff" />
      <spotLight position={[0, 10, 0]} intensity={3} color="#fff" penumbra={1} distance={50} />
      
      {/* Light specifically for the target to make it pop instead of being a black blob */}
      <pointLight position={[0, 2, -18]} intensity={5} color="#fff" distance={10} />
      
      {/* Intro Stickman */}

      {shotState === 'intro' && <Stickman phase="intro" />}
      
      <Bow state={shotState} />
      
      {/* The actual flying arrow, hidden until fired */}
      {(shotState === 'flying' || shotState === 'paused' || shotState === 'hit') && (
        <Arrow 
          position={[deviation.x, 1.5 + deviation.y, arrowZ]} 
          rotation={[pitch, yaw, 0]} 
          state={shotState} 
        />
      )}
      
      <TargetBoard />
      
      {/* Cool cyber grid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -10]}>
        <planeGeometry args={[100, 100, 20, 20]} />
        <meshStandardMaterial color="#0a0a0a" wireframe={true} emissive="#00ffcc" emissiveIntensity={0.2} />
      </mesh>
      
      {shotState === 'flying' && (
        <Sparkles count={50} scale={2} size={2} speed={0.5} opacity={0.5} position={[deviation.x, 1.5 + deviation.y, arrowZ]} color="#00ffcc" />
      )}
    </>
  );
}

export default function ArcheryGame({ 
  active, 
  shotKey,
  currentQIndex,
  isPaused, 
  wrongCount, 
  onShotEvent 
}) {

  const [shotState, setShotState] = useState('idle'); // idle, intro, flying, paused, hit
  const [internalActive, setInternalActive] = useState(false);

  const [hasInitiated, setHasInitiated] = useState(false);

  useEffect(() => {
    if (!active) {
      setShotState('idle');
      // Intentionally NOT setting internalActive to false so we don't show the button again
    }
  }, [active]);

  useEffect(() => {
    // Start shot if we have initiated and are idle
    if (internalActive && shotState === 'idle') {
      setHasInitiated(true);
      setShotState('intro');
      setTimeout(() => {
        setShotState('flying');
      }, 2000);
    }
  }, [internalActive]);

  // Handle next shot seamlessly when `shotKey` changes
  useEffect(() => {
    if (hasInitiated && active) {
      setShotState('intro');
      setTimeout(() => {
        setShotState('flying');
      }, 2000);
    }
  }, [shotKey]);


  // Handle pause resume
  useEffect(() => {
    if (internalActive && !isPaused && shotState === 'paused') {
      setShotState('flying');
    }
  }, [isPaused, internalActive, shotState]);

  const handleShotEvent = (event) => {
    if (event === 'paused') {
      setShotState('paused');
      onShotEvent('paused');
    } else if (event === 'hit') {
      setShotState('hit');
      onShotEvent('hit');
    }
  };

  return (
    <div className="w-full h-full min-h-[600px] border-4 border-slate-900 bg-sky-100 shadow-[12px_12px_0px_#0f172a] relative overflow-hidden">
      {(!internalActive) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-white border-4 border-slate-900 shadow-[8px_8px_0px_#000] flex items-center justify-center mb-6">
               <Zap className="w-12 h-12 text-slate-900 stroke-[3px]" />
            </div>
            <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter drop-shadow-[4px_4px_0px_#000]">ZEN ARCHER 3D</h2>
            <p className="text-white/80 font-black mb-8 uppercase tracking-[0.3em] text-[10px]">Neural Focus Simulation v1.0</p>
            
            <div className="max-w-xs text-white/90 text-xs font-bold uppercase leading-relaxed mb-10 text-center space-y-2">
               <p className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-lime-400" /> 3 Questions per arrow flight</p>
               <p className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-lime-400" /> Arrow pauses at checkpoints</p>
               <p className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-lime-400" /> Accuracy tied to precision</p>
            </div>
            
            <button 
              onClick={() => setInternalActive(true)}
              className="px-12 py-5 bg-lime-400 border-4 border-slate-900 text-slate-900 font-black uppercase tracking-[0.2em] shadow-[8px_8px_0px_#0f172a] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all text-sm flex items-center gap-3"
            >
              Initiate Neural Link <Zap className="w-5 h-5 fill-slate-900" />
            </button>
          </motion.div>
        </div>
      )}

      <Canvas 
        shadows 
        gl={{ powerPreference: "high-performance", antialias: false, preserveDrawingBuffer: true, alpha: false }}
        onCreated={(state) => state.gl.setClearColor('#e0f2fe')}
      >
        <PerspectiveCamera makeDefault position={[0, 1.8, 8]} fov={60} />
        <ArcheryScene 
           shotState={shotState} 
           wrongCount={wrongCount} 
           currentQIndex={currentQIndex}
           onImpact={handleShotEvent}
        />
      </Canvas>
      
      <div className="absolute top-6 left-6 z-10 flex gap-4">
         <div className="bg-slate-900 border-b-4 border-lime-400 p-3 shadow-[4px_4px_0px_#000] min-w-[120px]">
            <div className="text-[9px] font-black text-lime-400 uppercase tracking-widest mb-1">Link Sync</div>
            <div className="text-2xl font-black text-white tabular-nums">
               {Math.max(0, 100 - (wrongCount * 33))}%
            </div>
         </div>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
        <div className="bg-white border-4 border-slate-900 p-4 shadow-[4px_4px_0px_#0f172a]">
           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Arrow Propagation</div>
           <div className="w-48 h-3 bg-slate-100 border-2 border-slate-900 overflow-hidden relative">
             <motion.div animate={{ width: `${shotState === 'hit' ? 100 : ((currentQIndex || 0) * 33) + (shotState === 'flying' ? 15 : 0)}%` }} className="h-full bg-indigo-500" />
             {/* Checkpoint markers */}
             <div className="absolute top-0 bottom-0 left-[33%] w-0.5 bg-slate-900/20" />
             <div className="absolute top-0 bottom-0 left-[66%] w-0.5 bg-slate-900/20" />
           </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <AnimatePresence>
             {shotState === 'paused' && (
               <motion.div 
                 initial={{ x: 20, opacity: 0 }} 
                 animate={{ x: 0, opacity: 1 }} 
                 exit={{ x: 20, opacity: 0 }}
                 className="bg-yellow-300 text-slate-900 px-4 py-2 font-black uppercase text-xs border-4 border-slate-900 shadow-[4px_4px_0px_#000] flex items-center gap-2"
               >
                 <Loader className="w-4 h-4 animate-spin" /> Neural Checkpoint Reached
               </motion.div>
             )}
           </AnimatePresence>
           
           <div className="bg-slate-900 text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-l-4 border-lime-400 shadow-[4px_4px_0px_#000]">
             Vector State: {wrongCount === 0 ? "STABLE" : wrongCount === 1 ? "CORRECTING" : "UNSTABLE"}
           </div>
        </div>
      </div>
    </div>
  );
}
