import React, { useState, useEffect, useReducer, useRef, useContext, createContext, useCallback, useMemo } from 'react';
import { 
  Play, Settings, Save, FolderOpen, Download, Upload, Undo, Redo, 
  MousePointer2, Move, Maximize, RotateCw, Trash2, Layers, Sliders,
  Plus, Box, Type, Sparkles, Music, X, Check, ChevronRight, ChevronDown,
  Activity, Cpu, Code, Database, Image as ImageIcon, FileIcon,
  Menu, PlayCircle, Square, ZoomIn, ZoomOut, Eye, EyeOff, Lock, Unlock,
  Copy, FileText, Volume2, Film, Pause, GripVertical, Edit3, ArrowRight,
  ArrowLeft, ArrowUp, ArrowDown, Zap, RefreshCw, Settings2, Grid3X3,
  Monitor, Sun, Moon, Palette, Ruler, Crosshair, Circle, Hexagon,
  Search, GitBranch, Target, Anchor, Power, ToggleLeft, ToggleRight,
  Variable, Hash, Minus, Divide, Equal, AlertTriangle, Info, PanelLeft, PanelRight,
  ImagePlus
} from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_PROJECT = {
  id: 'default-project',
  name: 'New Game Project',
  settings: { 
    width: 1280, 
    height: 720, 
    bgColor: '#111827',
    viewport: { width: 1280, height: 720 },
    grid: { width: 64, height: 64, opacity: 0.1, color: '#ffffff', snap: true },
    gameFrame: { enabled: true, showInEditor: true, color: '#3b82f6', opacity: 0.3 }
  },
  scenes: [
    {
      id: 'scene-1',
      name: 'Main Menu',
      objects: [
        {
          id: 'obj-1',
          name: 'Player',
          type: 'Sprite',
          transform: { x: 640, y: 360, w: 100, h: 100, rotation: 0 },
          rendering: { color: '#3b82f6', opacity: 1, sprite: null },
          behaviors: [
            { id: 'beh-physics', type: 'Physics2D', gravity: 9.8, bodyType: 'Dynamic', bounce: 0.2, friction: 0.5 },
            { id: 'beh-collider', type: 'BoxCollider', width: 100, height: 100, offsetX: 0, offsetY: 0 }
          ],
          scripts: []
        },
        {
          id: 'obj-2',
          name: 'Ground Floor',
          type: 'Sprite',
          transform: { x: 640, y: 600, w: 800, h: 40, rotation: 0 },
          rendering: { color: '#10b981', opacity: 1, sprite: null },
          behaviors: [
            { id: 'beh-physics-ground', type: 'Physics2D', gravity: 0, bodyType: 'Static', bounce: 0, friction: 0.5 },
            { id: 'beh-collider-ground', type: 'BoxCollider', width: 800, height: 40, offsetX: 0, offsetY: 0 }
          ],
          scripts: []
        }
      ]
    }
  ],
  scripts: [
    {
      id: 'script-default',
      name: 'New Script',
      nodes: [
        { id: 'node-start', type: 'Event', name: 'Every Frame', x: -200, y: -50, dataType: 'execution' },
        { id: 'node-move', type: 'Action', name: 'Add To X', x: 100, y: -50, params: { value: 2 }, dataType: 'execution' }
      ],
      connections: [{ from: 'node-start', to: 'node-move', fromPort: 'out', toPort: 'in' }]
    }
  ],
  assets: []
};

const INITIAL_EDITOR_STATE = {
  activeScreen: 'SCENE_EDITOR', 
  activeSceneId: 'scene-1',
  selectedObjectIds: [],
  currentTool: 'select', 
  camera: { x: 0, y: 0, zoom: 0.6 },
  panels: { hierarchy: true, properties: true },
  history: [],
  historyPointer: -1,
  isPlaying: false,
  playTime: 0,
  prePlayState: null,
  activeEditingScriptId: null
};

const loadSavedState = () => {
  try {
    const saved = localStorage.getItem('nebula_engine_state_v4');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.project.assets) parsed.project.assets = [];
      if (!parsed.project.scripts) parsed.project.scripts = [];
      if (!parsed.project.settings.viewport) parsed.project.settings.viewport = { width: 1280, height: 720 };
      if (!parsed.project.settings.grid) parsed.project.settings.grid = { width: 64, height: 64, opacity: 0.1, color: '#ffffff', snap: true };
      if (!parsed.project.settings.gameFrame) parsed.project.settings.gameFrame = { enabled: true, showInEditor: true, color: '#3b82f6', opacity: 0.3 };
      parsed.project.scenes.forEach(s => {
        if (!s.objects) s.objects = [];
        s.objects.forEach(o => {
          if (!o.behaviors) o.behaviors = [];
          if (!o.scripts) o.scripts = [];
          if (!o.rendering) o.rendering = { color: '#9ca3af', opacity: 1, sprite: null };
          if (!o.transform) o.transform = { x: 0, y: 0, w: 64, h: 64, rotation: 0 };
        });
      });
      return parsed;
    }
  } catch (e) { console.error("Failed to load state", e); }
  return { project: INITIAL_PROJECT, editor: INITIAL_EDITOR_STATE };
};

const EngineContext = createContext();

function engineReducer(state, action) {
  const { project, editor } = state;
  const currentSceneIndex = project.scenes.findIndex(s => s.id === editor.activeSceneId);
  const currentScene = project.scenes[currentSceneIndex] || { objects: [] };

  const pushHistory = (newState) => {
    const snap = JSON.parse(JSON.stringify(newState.project));
    return {
      ...newState,
      editor: {
        ...newState.editor,
        history: [...newState.editor.history.slice(0, newState.editor.historyPointer + 1), snap].slice(-30),
        historyPointer: Math.min(newState.editor.historyPointer + 1, 29)
      }
    };
  };

  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, editor: { ...editor, activeScreen: action.payload } };
    case 'TOGGLE_PANEL':
      return { ...state, editor: { ...editor, panels: { ...editor.panels, [action.payload]: !editor.panels[action.payload] } } };
    case 'SET_TOOL':
      return { ...state, editor: { ...editor, currentTool: action.payload } };
    case 'UPDATE_CAMERA':
      return { ...state, editor: { ...editor, camera: { ...editor.camera, ...action.payload } } };
    case 'SELECT_OBJECT':
      return { ...state, editor: { ...editor, selectedObjectIds: [action.payload] } };
    case 'DESELECT_ALL':
      return { ...state, editor: { ...editor, selectedObjectIds: [] } };
    case 'ADD_OBJECT': {
      const newObj = {
        id: generateId(),
        name: action.payload.name || 'New ' + (action.payload.type || 'Sprite'),
        type: action.payload.type || 'Sprite',
        transform: { x: 640, y: 360, w: 64, h: 64, rotation: 0, ...action.payload.transform },
        rendering: { 
          color: action.payload.type === 'Text' ? '#ffffff' : '#9ca3af', 
          opacity: 1, 
          sprite: null,
          fontSize: action.payload.type === 'Text' ? 24 : undefined,
          text: action.payload.type === 'Text' ? 'Text' : undefined
        },
        behaviors: [],
        scripts: [],
        locked: false,
        hidden: false
      };
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = { ...currentScene, objects: [...currentScene.objects, newObj] };
      return pushHistory({
        ...state,
        project: { ...project, scenes: updatedScenes },
        editor: { ...editor, selectedObjectIds: [newObj.id], currentTool: 'move' }
      });
    }
    case 'UPDATE_OBJECT': {
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = {
        ...currentScene,
        objects: currentScene.objects.map(obj => 
          obj.id === action.payload.id ? { ...obj, ...action.payload.updates } : obj
        )
      };
      return pushHistory({
        ...state,
        project: { ...project, scenes: updatedScenes }
      });
    }
    case 'UPDATE_OBJECT_TRANSIENT': {
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = {
        ...currentScene,
        objects: currentScene.objects.map(obj => obj.id === action.payload.id ? { ...obj, ...action.payload.updates } : obj)
      };
      return { ...state, project: { ...project, scenes: updatedScenes } };
    }
    case 'COMMIT_HISTORY': {
      return pushHistory(state);
    }
    case 'DELETE_OBJECT': {
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = {
        ...currentScene,
        objects: currentScene.objects.filter(obj => !action.payload.includes(obj.id))
      };
      return pushHistory({
        ...state,
        project: { ...project, scenes: updatedScenes },
        editor: { ...editor, selectedObjectIds: editor.selectedObjectIds.filter(id => !action.payload.includes(id)) }
      });
    }
    case 'DUPLICATE_OBJECT': {
      const objToDup = currentScene.objects.find(o => o.id === action.payload);
      if (!objToDup) return state;
      const newObj = {
        ...JSON.parse(JSON.stringify(objToDup)),
        id: generateId(),
        name: objToDup.name + ' (Copy)',
        transform: { ...objToDup.transform, x: objToDup.transform.x + 20, y: objToDup.transform.y + 20 }
      };
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = {
        ...currentScene,
        objects: [...currentScene.objects, newObj]
      };
      return pushHistory({
        ...state,
        project: { ...project, scenes: updatedScenes },
        editor: { ...editor, selectedObjectIds: [newObj.id] }
      });
    }
    case 'ADD_BEHAVIOR': {
      const { objectId, behaviorType, behaviorData } = action.payload;
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = {
        ...currentScene,
        objects: currentScene.objects.map(obj => 
          obj.id === objectId ? { ...obj, behaviors: [...obj.behaviors, { id: generateId(), type: behaviorType, ...behaviorData }] } : obj
        )
      };
      return pushHistory({ ...state, project: { ...project, scenes: updatedScenes }});
    }
    case 'REMOVE_BEHAVIOR': {
      const { objectId, behaviorId } = action.payload;
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = {
        ...currentScene,
        objects: currentScene.objects.map(obj => 
          obj.id === objectId ? { ...obj, behaviors: obj.behaviors.filter(b => b.id !== behaviorId) } : obj
        )
      };
      return pushHistory({ ...state, project: { ...project, scenes: updatedScenes }});
    }
    case 'UPDATE_BEHAVIOR': {
      const { objectId, behaviorId, updates } = action.payload;
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = {
        ...currentScene,
        objects: currentScene.objects.map(obj => 
          obj.id === objectId ? { 
            ...obj, 
            behaviors: obj.behaviors.map(b => b.id === behaviorId ? { ...b, ...updates } : b) 
          } : obj
        )
      };
      return pushHistory({ ...state, project: { ...project, scenes: updatedScenes }});
    }
    case 'UNDO': {
      if (editor.historyPointer <= 0) return state;
      const newPointer = editor.historyPointer - 1;
      return {
        ...state,
        project: JSON.parse(JSON.stringify(editor.history[newPointer])),
        editor: { ...editor, historyPointer: newPointer }
      };
    }
    case 'REDO': {
      if (editor.historyPointer >= editor.history.length - 1) return state;
      const newPointer = editor.historyPointer + 1;
      return {
        ...state,
        project: JSON.parse(JSON.stringify(editor.history[newPointer])),
        editor: { ...editor, historyPointer: newPointer }
      };
    }
    case 'ADD_SCENE': {
      const newScene = {
        id: generateId(),
        name: action.payload.name || 'New Scene',
        objects: []
      };
      return pushHistory({
        ...state,
        project: { ...project, scenes: [...project.scenes, newScene] },
        editor: { ...editor, activeSceneId: newScene.id }
      });
    }
    case 'DELETE_SCENE': {
      if (project.scenes.length <= 1) return state;
      const filtered = project.scenes.filter(s => s.id !== action.payload);
      return pushHistory({
        ...state,
        project: { ...project, scenes: filtered },
        editor: { ...editor, activeSceneId: filtered[0].id, selectedObjectIds: [] }
      });
    }
    case 'RENAME_SCENE': {
      const updatedScenes = project.scenes.map(s => 
        s.id === action.payload.id ? { ...s, name: action.payload.name } : s
      );
      return pushHistory({ ...state, project: { ...project, scenes: updatedScenes } });
    }
    case 'SET_ACTIVE_SCENE':
      return { ...state, editor: { ...editor, activeSceneId: action.payload, selectedObjectIds: [] } };
    case 'TOGGLE_PLAY_MODE': {
      const isPlaying = !editor.isPlaying;
      if (isPlaying) {
        return { 
          ...state, 
          editor: { 
            ...editor, 
            isPlaying: true, 
            selectedObjectIds: [],
            prePlayState: JSON.parse(JSON.stringify(state.project))
          } 
        };
      } else {
        return {
          ...state,
          project: editor.prePlayState ? JSON.parse(JSON.stringify(editor.prePlayState)) : state.project,
          editor: { ...editor, isPlaying: false, prePlayState: null }
        };
      }
    }
    case 'UPDATE_PLAY_TIME':
      return { ...state, editor: { ...editor, playTime: action.payload } };
    case 'ADD_ASSET': {
      const newAsset = {
        id: generateId(),
        name: action.payload.name,
        type: action.payload.type,
        url: action.payload.url || null
      };
      return pushHistory({
        ...state,
        project: { ...project, assets: [...(project.assets || []), newAsset] }
      });
    }
    case 'DELETE_ASSET': {
      return pushHistory({
        ...state,
        project: { ...project, assets: (project.assets || []).filter(a => a.id !== action.payload) }
      });
    }
    case 'ADD_SCRIPT': {
      const newScript = {
        id: generateId(),
        name: action.payload.name || 'New Script',
        nodes: action.payload.nodes || [],
        connections: action.payload.connections || []
      };
      return pushHistory({
        ...state,
        project: { ...project, scripts: [...(project.scripts || []), newScript] }
      });
    }
    case 'DELETE_SCRIPT': {
      return pushHistory({
        ...state,
        project: { 
          ...project, 
          scripts: (project.scripts || []).filter(s => s.id !== action.payload),
          scenes: project.scenes.map(s => ({
            ...s,
            objects: s.objects.map(o => ({
              ...o,
              scripts: (o.scripts || []).filter(sc => sc.scriptId !== action.payload)
            }))
          }))
        }
      });
    }
    case 'UPDATE_SCRIPT': {
      const updatedScripts = project.scripts.map(s => 
        s.id === action.payload.id ? { ...s, ...action.payload.updates } : s
      );
      return pushHistory({ ...state, project: { ...project, scripts: updatedScripts } });
    }
    case 'RENAME_SCRIPT': {
      const updatedScripts = project.scripts.map(s => 
        s.id === action.payload.id ? { ...s, name: action.payload.name } : s
      );
      return pushHistory({ ...state, project: { ...project, scripts: updatedScripts } });
    }
    case 'ADD_OBJECT_SCRIPT': {
      const { objectId, scriptId } = action.payload;
      const script = project.scripts.find(s => s.id === scriptId);
      if (!script) return state;
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = {
        ...currentScene,
        objects: currentScene.objects.map(obj => 
          obj.id === objectId 
            ? { ...obj, scripts: [...(obj.scripts || []), { id: generateId(), scriptId, enabled: true, name: script.name }] } 
            : obj
        )
      };
      return pushHistory({ ...state, project: { ...project, scenes: updatedScenes }});
    }
    case 'REMOVE_OBJECT_SCRIPT': {
      const { objectId, scriptRefId } = action.payload;
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = {
        ...currentScene,
        objects: currentScene.objects.map(obj => 
          obj.id === objectId 
            ? { ...obj, scripts: (obj.scripts || []).filter(s => s.id !== scriptRefId) } 
            : obj
        )
      };
      return pushHistory({ ...state, project: { ...project, scenes: updatedScenes }});
    }
    case 'TOGGLE_OBJECT_SCRIPT': {
      const { objectId, scriptRefId } = action.payload;
      const updatedScenes = [...project.scenes];
      updatedScenes[currentSceneIndex] = {
        ...currentScene,
        objects: currentScene.objects.map(obj => 
          obj.id === objectId 
            ? { ...obj, scripts: (obj.scripts || []).map(s => s.id === scriptRefId ? { ...s, enabled: !s.enabled } : s) } 
            : obj
        )
      };
      return { ...state, project: { ...project, scenes: updatedScenes }};
    }
    case 'APPLY_SCRIPT_CHANGES': {
      return { ...state, project: { ...project, ...action.payload } };
    }
    case 'UPDATE_SETTINGS': {
      return pushHistory({
        ...state,
        project: { ...project, settings: { ...project.settings, ...action.payload } }
      });
    }
    case 'TOGGLE_SETTINGS':
      return { ...state, editor: { ...editor, settingsOpen: !editor.settingsOpen } };
    case 'RESET_STATE':
      return { project: INITIAL_PROJECT, editor: INITIAL_EDITOR_STATE };
    case 'SET_EDITING_SCRIPT':
      return { ...state, editor: { ...editor, activeEditingScriptId: action.payload, activeScreen: 'SCRIPT_EDITOR' } };
    default:
      return state;
  }
}

// ==========================================
// --- UI PRIMITIVES ---
// ==========================================

const IconButton = ({ icon: Icon, onClick, active, tooltip, className = '', disabled = false, size = 20 }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={tooltip}
    className={`p-2 rounded-lg transition-colors flex items-center justify-center shrink-0
      ${active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${className}
    `}
  >
    <Icon size={size} />
  </button>
);

const PanelSection = ({ title, icon: Icon, children, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="border-b border-gray-700 last:border-b-0">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
          {Icon && <Icon size={16} />}
          {title}
        </div>
        {expanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
      </button>
      <div className={`p-3 bg-gray-850 ${expanded ? 'block' : 'hidden'}`}>
        {children}
      </div>
    </div>
  );
};

const MobileInput = ({ label, value, onChange, type = "text", min, max, step, className = '' }) => {
  const [localValue, setLocalValue] = useState(String(value));
  const inputRef = useRef(null);

  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const commit = () => {
    let finalValue = localValue;
    if (type === 'number') {
      finalValue = parseFloat(localValue);
      if (isNaN(finalValue)) finalValue = 0;
      if (min !== undefined) finalValue = Math.max(min, finalValue);
      if (max !== undefined) finalValue = Math.min(max, finalValue);
    }
    onChange(finalValue);
  };

  return (
    <div className={`flex items-center justify-between mb-2 ${className}`}>
      <label className="text-xs text-gray-400 w-1/3">{label}</label>
      <input 
        ref={inputRef}
        type={type} 
        value={localValue} 
        onChange={e => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { commit(); inputRef.current?.blur(); }}}
        min={min}
        max={max}
        step={step}
        className="w-2/3 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
        style={{ fontSize: '16px' }}
      />
    </div>
  );
};

const ColorInput = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs text-gray-400 w-1/3">{label}</label>
      <div className="w-2/3 flex items-center gap-2">
        <input 
          type="color" 
          value={value} 
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-gray-600 cursor-pointer bg-transparent"
        />
        <span className="text-xs text-gray-500 font-mono">{value}</span>
      </div>
    </div>
  );
};

// ==========================================
// --- CONTEXT MENU SYSTEM (FIXED) ---
// ==========================================

const ContextMenu = ({ x, y, items, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    // Use capture phase for better reliability
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('touchstart', handleClick, true);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('touchstart', handleClick, true);
    };
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <div 
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-[180px]"
      style={{ left: adjustedX, top: adjustedY, zIndex: 999999 }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider ? (
            <div className="border-t border-gray-700 my-1" />
          ) : (
            <button
              onClick={() => { item.onClick(); onClose(); }}
              disabled={item.disabled}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                ${item.disabled ? 'opacity-50 cursor-not-allowed text-gray-500' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                ${item.danger ? 'hover:text-red-400' : ''}
              `}
            >
              {item.icon && <item.icon size={16} className={item.danger ? 'text-red-400' : 'text-gray-400'} />}
              {item.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// FIXED: Ultra-simplified context menu - no lag
const useContextMenu = () => {
  const [menu, setMenu] = useState(null);

  const openMenu = useCallback((e, items) => {
    e.preventDefault();
    e.stopPropagation();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setMenu({ x, y, items });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  return { menu, openMenu, closeMenu };
};

// ==========================================
// --- SCRIPT EXECUTION ENGINE ---
// ==========================================

const executeScripts = (project) => {
  const newProject = JSON.parse(JSON.stringify(project));

  newProject.scenes.forEach(scene => {
    scene.objects.forEach(obj => {
      if (!obj.scripts) return;

      obj.scripts.forEach(scriptRef => {
        if (!scriptRef.enabled) return;

        const script = newProject.scripts.find(s => s.id === scriptRef.scriptId);
        if (!script || !script.nodes) return;

        script.nodes.forEach(node => {
          if (node.type === 'Event' && node.name === 'Every Frame') {
            const connections = script.connections.filter(c => c.from === node.id);
            connections.forEach(conn => {
              const actionNode = script.nodes.find(n => n.id === conn.to);
              if (actionNode) {
                executeAction(actionNode, obj);
              }
            });
          }
        });
      });
    });
  });

  return newProject;
};

const executeAction = (node, obj) => {
  const params = node.params || {};
  const transform = obj.transform;

  switch(node.name) {
    case 'Add To X':
      transform.x += parseFloat(params.value) || 1;
      break;
    case 'Add To Y':
      transform.y += parseFloat(params.value) || 1;
      break;
    case 'Set Position':
      transform.x = parseFloat(params.x) || transform.x;
      transform.y = parseFloat(params.y) || transform.y;
      break;
    case 'Set Rotation':
      transform.rotation = parseFloat(params.value) || 0;
      break;
    case 'Set Scale':
      transform.w = parseFloat(params.w) || transform.w;
      transform.h = parseFloat(params.h) || transform.h;
      break;
    case 'Set Opacity':
      obj.rendering.opacity = parseFloat(params.value) || 1;
      break;
    case 'Destroy':
      obj._destroyed = true;
      break;
  }
};

// ==========================================
// --- PHYSICS AND AABB COLLISION ---
// ==========================================

const runPhysicsSimulation = (scene, dt) => {
  if (!scene || !scene.objects) return scene;

  const objects = JSON.parse(JSON.stringify(scene.objects));

  objects.forEach(obj => {
    if (obj.hidden || obj._destroyed) return;
    const physics = obj.behaviors?.find(b => b.type === 'Physics2D');

    if (physics) {
      if (!physics.velocityX) physics.velocityX = 0;
      if (!physics.velocityY) physics.velocityY = 0;

      if (physics.bodyType === 'Dynamic') {
        const gravityScale = physics.gravity !== undefined ? physics.gravity : 9.8;
        physics.velocityY += gravityScale * dt * 25;

        obj.transform.x += physics.velocityX * dt;
        obj.transform.y += physics.velocityY * dt;
      }
    }
  });

  for (let i = 0; i < objects.length; i++) {
    const objA = objects[i];
    if (objA.hidden || objA._destroyed) continue;

    const physicsA = objA.behaviors?.find(b => b.type === 'Physics2D');
    const colliderA = objA.behaviors?.find(b => b.type === 'BoxCollider');

    if (!physicsA || !colliderA || physicsA.bodyType !== 'Dynamic') continue;

    const halfWA = (colliderA.width || objA.transform.w) / 2;
    const halfHA = (colliderA.height || objA.transform.h) / 2;

    for (let j = 0; j < objects.length; j++) {
      if (i === j) continue;
      const objB = objects[j];
      if (objB.hidden || objB._destroyed) continue;

      const colliderB = objB.behaviors?.find(b => b.type === 'BoxCollider');
      if (!colliderB) continue;

      const halfWB = (colliderB.width || objB.transform.w) / 2;
      const halfHB = (colliderB.height || objB.transform.h) / 2;

      const rectA = {
        minX: objA.transform.x - halfWA + (colliderA.offsetX || 0),
        maxX: objA.transform.x + halfWA + (colliderA.offsetX || 0),
        minY: objA.transform.y - halfHA + (colliderA.offsetY || 0),
        maxY: objA.transform.y + halfHA + (colliderA.offsetY || 0),
      };

      const rectB = {
        minX: objB.transform.x - halfWB + (colliderB.offsetX || 0),
        maxX: objB.transform.x + halfWB + (colliderB.offsetX || 0),
        minY: objB.transform.y - halfHB + (colliderB.offsetY || 0),
        maxY: objB.transform.y + halfHB + (colliderB.offsetY || 0),
      };

      const overlapX = Math.min(rectA.maxX, rectB.maxX) - Math.max(rectA.minX, rectB.minX);
      const overlapY = Math.min(rectA.maxY, rectB.maxY) - Math.max(rectA.minY, rectB.minY);

      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
          const pushX = (objA.transform.x < objB.transform.x) ? -overlapX : overlapX;
          objA.transform.x += pushX;
          physicsA.velocityX = 0;
        } else {
          const pushY = (objA.transform.y < objB.transform.y) ? -overlapY : overlapY;
          objA.transform.y += pushY;

          if (pushY < 0 && physicsA.velocityY > 0) {
             const bounce = physicsA.bounce !== undefined ? physicsA.bounce : 0.3;
             if (Math.abs(physicsA.velocityY) > 2) {
               physicsA.velocityY = -physicsA.velocityY * bounce;
             } else {
               physicsA.velocityY = 0;
             }
          } else if (pushY > 0 && physicsA.velocityY < 0) {
             physicsA.velocityY = 0;
          }
        }
      }
    }
  }

  scene.objects = objects;
  return scene;
};

// ==========================================
// --- TRANSFORM GIZMO ---
// ==========================================

const TransformGizmo = React.memo(({ object, tool, camera, onInteractionStart }) => {
  if (!object || tool === 'pan' || tool === 'select') return null;

  const cx = object.transform.x;
  const cy = object.transform.y;
  const w = object.transform.w;
  const h = object.transform.h;
  const rot = object.transform.rotation;

  const invScale = 1 / camera.zoom;
  const handleSize = 24 * invScale;
  const strokeW = 2 * invScale;

  const handlePointerDown = (e, axis) => {
    e.stopPropagation();
    onInteractionStart(e, axis);
  };

  return (
    <div className="absolute pointer-events-none" style={{ left: `${cx}px`, top: `${cy}px`, transform: `rotate(${rot}deg)`, zIndex: 50 }}>
      <svg className="overflow-visible absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 1, height: 1 }}>

        {tool === 'move' && (
          <g>
            <circle cx={0} cy={0} r={handleSize/2} fill="#3b82f6" fillOpacity="0.8" className="pointer-events-auto cursor-move hover:fill-blue-400" onPointerDown={(e) => handlePointerDown(e, 'move_xy')} />
            <g className="pointer-events-auto cursor-ew-resize group" onPointerDown={(e) => handlePointerDown(e, 'move_x')}>
              <line x1={0} y1={0} x2={100 * invScale} y2={0} stroke="transparent" strokeWidth={handleSize * 1.5} />
              <line x1={0} y1={0} x2={80 * invScale} y2={0} stroke="#ef4444" strokeWidth={strokeW} className="group-hover:stroke-red-400" />
              <polygon points={`${80 * invScale},${-6 * invScale} ${100 * invScale},0 ${80 * invScale},${6 * invScale}`} fill="#ef4444" className="group-hover:fill-red-400" />
            </g>
            <g className="pointer-events-auto cursor-ns-resize group" onPointerDown={(e) => handlePointerDown(e, 'move_y')}>
              <line x1={0} y1={0} x2={0} y2={100 * invScale} stroke="transparent" strokeWidth={handleSize * 1.5} />
              <line x1={0} y1={0} x2={0} y2={80 * invScale} stroke="#22c55e" strokeWidth={strokeW} className="group-hover:stroke-green-400" />
              <polygon points={`${-6 * invScale},${80 * invScale} 0,${100 * invScale} ${6 * invScale},${80 * invScale}`} fill="#22c55e" className="group-hover:fill-green-400" />
            </g>
          </g>
        )}

        {tool === 'scale' && (
          <g>
            <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke="#3b82f6" strokeWidth={strokeW} strokeDasharray={`${4*invScale},${4*invScale}`} />

            {[
              { x: -w/2, y: -h/2, cursor: 'nwse-resize', axis: 'scale_tl' },
              { x: w/2, y: -h/2, cursor: 'nesw-resize', axis: 'scale_tr' },
              { x: -w/2, y: h/2, cursor: 'nesw-resize', axis: 'scale_bl' },
              { x: w/2, y: h/2, cursor: 'nwse-resize', axis: 'scale_br' }
            ].map((p, i) => (
              <rect key={`corner-${i}`} x={p.x - handleSize/2} y={p.y - handleSize/2} width={handleSize} height={handleSize} fill="#ffffff" stroke="#3b82f6" strokeWidth={strokeW} className="pointer-events-auto hover:fill-blue-200" style={{ cursor: p.cursor }} onPointerDown={(e) => handlePointerDown(e, p.axis)} />
            ))}

            {[
              { x: 0, y: -h/2, cursor: 'ns-resize', axis: 'scale_t' },
              { x: 0, y: h/2, cursor: 'ns-resize', axis: 'scale_b' },
              { x: -w/2, y: 0, cursor: 'ew-resize', axis: 'scale_l' },
              { x: w/2, y: 0, cursor: 'ew-resize', axis: 'scale_r' }
            ].map((p, i) => (
              <rect key={`edge-${i}`} x={p.x - handleSize/3} y={p.y - handleSize/3} width={handleSize/1.5} height={handleSize/1.5} fill="#3b82f6" className="pointer-events-auto hover:fill-blue-400" style={{ cursor: p.cursor }} onPointerDown={(e) => handlePointerDown(e, p.axis)} />
            ))}
          </g>
        )}

        {tool === 'rotate' && (
          <g>
            <circle cx={0} cy={0} r={80 * invScale} fill="none" stroke="#eab308" strokeWidth={strokeW} strokeOpacity="0.5" />
            <circle cx={0} cy={0} r={4 * invScale} fill="#eab308" />
            <g className="pointer-events-auto cursor-grab active:cursor-grabbing group" onPointerDown={(e) => handlePointerDown(e, 'rotate')}>
              <circle cx={0} cy={0} r={80 * invScale} fill="none" stroke="transparent" strokeWidth={handleSize * 1.5} />
              <circle cx={80 * invScale} cy={0} r={handleSize/1.5} fill="#eab308" stroke="#ffffff" strokeWidth={strokeW} className="group-hover:fill-yellow-400" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
});

// ==========================================
// --- GAME FRAME ---
// ==========================================

const GameFrame = ({ settings, camera }) => {
  const gameFrame = settings.gameFrame || { enabled: true, showInEditor: true, color: '#3b82f6', opacity: 0.3 };
  if (!gameFrame.enabled || !gameFrame.showInEditor) return null;

  const vpW = settings.viewport?.width || 1280;
  const vpH = settings.viewport?.height || 720;

  return (
    <div 
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        width: `${vpW}px`,
        height: `${vpH}px`,
        transform: `translate(calc(-50% + ${camera.x}px), calc(-50% + ${camera.y}px)) scale(${camera.zoom})`,
        zIndex: 2,
        border: `2px solid ${gameFrame.color}`,
        boxShadow: `0 0 0 99999px rgba(0,0,0,${0.5 - (gameFrame.opacity || 0.3)}), inset 0 0 20px ${gameFrame.color}40`,
      }}
    >
      <div className="absolute -top-6 left-0 text-[10px] text-gray-300 font-mono tracking-widest bg-gray-900/80 px-2 py-0.5 rounded">
        {vpW}x{vpH} — Game Frame
      </div>
      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: gameFrame.color }} />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: gameFrame.color }} />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: gameFrame.color }} />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: gameFrame.color }} />
    </div>
  );
};

// ==========================================
// --- VIEWPORT (SCENE EDITOR) - FIXED PINCH ZOOM ---
// ==========================================

const SceneViewport = () => {
  const { state, dispatch } = useContext(EngineContext);
  const { currentTool, camera, selectedObjectIds, isPlaying } = state.editor;
  const currentScene = state.project.scenes.find(s => s.id === state.editor.activeSceneId);
  const settings = state.project.settings;

  const viewportRef = useRef(null);
  const isInteracting = useRef(false);
  const interactionState = useRef({
    type: null, 
    initialPinchDist: 0, 
    initialZoom: 1, 
    lastPanCenter: { x: 0, y: 0 },
    draggedObjInitialState: null, 
    pointerStartPos: { x: 0, y: 0 },
    lastTouchDistance: 0,
    isPinching: false
  });

  // CRITICAL FIX: Pinch zoom with proper touch handling
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    // Prevent browser zoom on the viewport
    const preventTouchZoom = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    el.addEventListener('touchstart', preventTouchZoom, { passive: false });
    el.addEventListener('touchmove', preventTouchZoom, { passive: false });

    return () => { 
      el.removeEventListener('touchstart', preventTouchZoom); 
      el.removeEventListener('touchmove', preventTouchZoom); 
    };
  }, []);

  const screenToWorld = useCallback((screenX, screenY) => {
    if (!viewportRef.current) return {x:0, y:0};
    const rect = viewportRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left - rect.width / 2 - camera.x) / camera.zoom,
      y: (screenY - rect.top - rect.height / 2 - camera.y) / camera.zoom
    };
  }, [camera.x, camera.y, camera.zoom]);

  const getHitObject = (worldX, worldY) => {
    const objs = [...currentScene.objects].reverse();
    for (let obj of objs) {
      if (obj.hidden || obj._destroyed) continue;
      const { x, y, w, h } = obj.transform;
      if (worldX >= x - w/2 && worldX <= x + w/2 && worldY >= y - h/2 && worldY <= y + h/2) return obj;
    }
    return null;
  };

  const handleGizmoInteractionStart = useCallback((e, axis) => {
    isInteracting.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const worldPos = screenToWorld(clientX, clientY);

    const obj = currentScene.objects.find(o => o.id === selectedObjectIds[0]);
    if(!obj) return;

    interactionState.current.type = axis;
    interactionState.current.draggedObjInitialState = { ...obj.transform, objId: obj.id, startX: worldPos.x, startY: worldPos.y };
  }, [currentScene, selectedObjectIds, screenToWorld]);

  // CRITICAL FIX: Proper touch event handling for pinch zoom
  const handleTouchStart = (e) => {
    if (isPlaying) return;

    const touches = e.touches;

    // PINCH ZOOM: Two finger touch
    if (touches.length === 2) {
      e.preventDefault();
      interactionState.current.isPinching = true;
      interactionState.current.type = 'pinch';

      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      interactionState.current.initialPinchDist = Math.hypot(dx, dy);
      interactionState.current.initialZoom = camera.zoom;
      interactionState.current.lastPanCenter = { 
        x: (touches[0].clientX + touches[1].clientX) / 2, 
        y: (touches[0].clientY + touches[1].clientY) / 2 
      };
      return;
    }

    // SINGLE TOUCH
    if (touches.length === 1) {
      const clientX = touches[0].clientX;
      const clientY = touches[0].clientY;

      isInteracting.current = true;
      interactionState.current.pointerStartPos = { x: clientX, y: clientY };

      const worldPos = screenToWorld(clientX, clientY);
      const hitObj = getHitObject(worldPos.x, worldPos.y);

      if (currentTool === 'pan') {
        interactionState.current.type = 'pan';
        interactionState.current.lastPanCenter = { x: clientX, y: clientY };
      } 
      else if (currentTool === 'select' || currentTool === 'move') {
        if (hitObj && !hitObj.locked) {
          if (!selectedObjectIds.includes(hitObj.id)) {
            dispatch({ type: 'SELECT_OBJECT', payload: hitObj.id });
          }
          interactionState.current.type = 'move_xy'; 
          interactionState.current.draggedObjInitialState = { ...hitObj.transform, startX: worldPos.x, startY: worldPos.y, objId: hitObj.id };
        } else {
          dispatch({ type: 'DESELECT_ALL' });
          interactionState.current.type = 'pan';
          interactionState.current.lastPanCenter = { x: clientX, y: clientY };
        }
      } 
      else if (currentTool === 'scale' || currentTool === 'rotate') {
        if (hitObj && !hitObj.locked) {
          if (!selectedObjectIds.includes(hitObj.id)) dispatch({ type: 'SELECT_OBJECT', payload: hitObj.id });
        } else {
          dispatch({ type: 'DESELECT_ALL' });
        }
        interactionState.current.type = 'pan';
        interactionState.current.lastPanCenter = { x: clientX, y: clientY };
      }
    }
  };

  const handleTouchMove = (e) => {
    if (!isInteracting.current || isPlaying) return;
    e.preventDefault();

    const touches = e.touches;

    // PINCH ZOOM MOVE
    if (touches.length === 2 && interactionState.current.isPinching) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const center = { 
        x: (touches[0].clientX + touches[1].clientX) / 2, 
        y: (touches[0].clientY + touches[1].clientY) / 2 
      };

      const scale = dist / interactionState.current.initialPinchDist;
      const newZoom = Math.max(0.15, Math.min(5, interactionState.current.initialZoom * scale));

      // Pan while pinching
      const panDx = center.x - interactionState.current.lastPanCenter.x;
      const panDy = center.y - interactionState.current.lastPanCenter.y;

      dispatch({ type: 'UPDATE_CAMERA', payload: { zoom: newZoom, x: camera.x + panDx, y: camera.y + panDy } });
      interactionState.current.lastPanCenter = center;
      return;
    }

    // SINGLE TOUCH MOVE
    if (touches.length === 1) {
      const clientX = touches[0].clientX;
      const clientY = touches[0].clientY;
      const type = interactionState.current.type;

      if (!type) return;

      if (type === 'pan') {
         const panDx = clientX - interactionState.current.lastPanCenter.x;
         const panDy = clientY - interactionState.current.lastPanCenter.y;
         dispatch({ type: 'UPDATE_CAMERA', payload: { x: camera.x + panDx, y: camera.y + panDy } });
         interactionState.current.lastPanCenter = { x: clientX, y: clientY };
      } else {
         const worldPos = screenToWorld(clientX, clientY);
         const state = interactionState.current.draggedObjInitialState;
         let dx = worldPos.x - state.startX;
         let dy = worldPos.y - state.startY;

         if (settings.grid.snap) {
           dx = Math.round(dx / settings.grid.width) * settings.grid.width;
           dy = Math.round(dy / settings.grid.height) * settings.grid.height;
         }

         let updates = {};

         if (type.startsWith('move')) {
           updates = { 
             x: type.includes('x') ? state.x + dx : state.x, 
             y: type.includes('y') ? state.y + dy : state.y 
           };
           if (type === 'move_xy') updates = { x: state.x + dx, y: state.y + dy };
         } 
         else if (type.startsWith('scale')) {
           if (type === 'scale_tl' || type === 'scale_tr' || type === 'scale_bl' || type === 'scale_br') {
             const factor = Math.max(-0.9, dx / state.w);
             updates = { 
               w: Math.max(8, state.w * (1 + factor)), 
               h: Math.max(8, state.h * (1 + factor)) 
             };
           } else {
             if (type === 'scale_x' || type === 'scale_l' || type === 'scale_r') {
               updates.w = Math.max(8, state.w + (type === 'scale_l' ? -dx : dx) * 2);
             }
             if (type === 'scale_y' || type === 'scale_t' || type === 'scale_b') {
               updates.h = Math.max(8, state.h + (type === 'scale_t' ? -dy : dy) * 2);
             }
           }
         } 
         else if (type === 'rotate') {
           const currentAngle = Math.atan2(worldPos.y - state.y, worldPos.x - state.x) * (180 / Math.PI);
           const startAngle = Math.atan2(state.startY - state.y, state.startX - state.x) * (180 / Math.PI);
           updates = { rotation: state.rotation + (currentAngle - startAngle) };
         }

         dispatch({ type: 'UPDATE_OBJECT_TRANSIENT', payload: { id: state.objId, updates: { transform: { ...state, ...updates } } } });
      }
    }
  };

  const handleTouchEnd = () => {
    const type = interactionState.current.type;
    if (type && (type.startsWith('move') || type.startsWith('scale') || type === 'rotate')) {
      dispatch({ type: 'COMMIT_HISTORY' });
    }
    isInteracting.current = false;
    interactionState.current.type = null;
    interactionState.current.isPinching = false;
  };

  // Mouse events (for desktop)
  const handlePointerDown = (e) => {
    if (isPlaying) return;
    if (e.button !== 0 && e.button !== 1) return;

    isInteracting.current = true;
    const clientX = e.clientX;
    const clientY = e.clientY;
    interactionState.current.pointerStartPos = { x: clientX, y: clientY };

    const worldPos = screenToWorld(clientX, clientY);
    const hitObj = getHitObject(worldPos.x, worldPos.y);

    if (currentTool === 'pan' || e.button === 1 || (e.button === 0 && e.altKey)) {
      interactionState.current.type = 'pan';
      interactionState.current.lastPanCenter = { x: clientX, y: clientY };
    } 
    else if (currentTool === 'select' || currentTool === 'move') {
      if (hitObj && !hitObj.locked) {
        if (!selectedObjectIds.includes(hitObj.id)) {
          dispatch({ type: 'SELECT_OBJECT', payload: hitObj.id });
        }
        interactionState.current.type = 'move_xy'; 
        interactionState.current.draggedObjInitialState = { ...hitObj.transform, startX: worldPos.x, startY: worldPos.y, objId: hitObj.id };
      } else {
        dispatch({ type: 'DESELECT_ALL' });
        interactionState.current.type = 'pan';
        interactionState.current.lastPanCenter = { x: clientX, y: clientY };
      }
    } 
    else if (currentTool === 'scale' || currentTool === 'rotate') {
      if (hitObj && !hitObj.locked) {
        if (!selectedObjectIds.includes(hitObj.id)) dispatch({ type: 'SELECT_OBJECT', payload: hitObj.id });
      } else {
        dispatch({ type: 'DESELECT_ALL' });
      }
      interactionState.current.type = 'pan';
      interactionState.current.lastPanCenter = { x: clientX, y: clientY };
    }
  };

  const handlePointerMove = (e) => {
    if (!isInteracting.current || isPlaying) return;

    const clientX = e.clientX;
    const clientY = e.clientY;
    const type = interactionState.current.type;

    if (!type || type === 'pinch') return;

    if (type === 'pan') {
       const panDx = clientX - interactionState.current.lastPanCenter.x;
       const panDy = clientY - interactionState.current.lastPanCenter.y;
       dispatch({ type: 'UPDATE_CAMERA', payload: { x: camera.x + panDx, y: camera.y + panDy } });
       interactionState.current.lastPanCenter = { x: clientX, y: clientY };
    } else {
       const worldPos = screenToWorld(clientX, clientY);
       const state = interactionState.current.draggedObjInitialState;
       let dx = worldPos.x - state.startX;
       let dy = worldPos.y - state.startY;

       if (settings.grid.snap) {
         dx = Math.round(dx / settings.grid.width) * settings.grid.width;
         dy = Math.round(dy / settings.grid.height) * settings.grid.height;
       }

       let updates = {};

       if (type.startsWith('move')) {
         updates = { 
           x: type.includes('x') ? state.x + dx : state.x, 
           y: type.includes('y') ? state.y + dy : state.y 
         };
         if (type === 'move_xy') updates = { x: state.x + dx, y: state.y + dy };
       } 
       else if (type.startsWith('scale')) {
         if (type === 'scale_tl' || type === 'scale_tr' || type === 'scale_bl' || type === 'scale_br') {
           const factor = Math.max(-0.9, dx / state.w);
           updates = { 
             w: Math.max(8, state.w * (1 + factor)), 
             h: Math.max(8, state.h * (1 + factor)) 
           };
         } else {
           if (type === 'scale_x' || type === 'scale_l' || type === 'scale_r') {
             updates.w = Math.max(8, state.w + (type === 'scale_l' ? -dx : dx) * 2);
           }
           if (type === 'scale_y' || type === 'scale_t' || type === 'scale_b') {
             updates.h = Math.max(8, state.h + (type === 'scale_t' ? -dy : dy) * 2);
           }
         }
       } 
       else if (type === 'rotate') {
         const currentAngle = Math.atan2(worldPos.y - state.y, worldPos.x - state.x) * (180 / Math.PI);
         const startAngle = Math.atan2(state.startY - state.y, state.startX - state.x) * (180 / Math.PI);
         updates = { rotation: state.rotation + (currentAngle - startAngle) };
       }

       dispatch({ type: 'UPDATE_OBJECT_TRANSIENT', payload: { id: state.objId, updates: { transform: { ...state, ...updates } } } });
    }
  };

  const handlePointerUp = () => {
    if (!isInteracting.current) return;
    const type = interactionState.current.type;
    if (type && (type.startsWith('move') || type.startsWith('scale') || type === 'rotate')) {
      dispatch({ type: 'COMMIT_HISTORY' });
    }
    isInteracting.current = false;
    interactionState.current.type = null;
    interactionState.current.isPinching = false;
  };

  const handleWheel = (e) => {
    if (isPlaying) return;
    e.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = e.deltaY < 0 ? Math.min(camera.zoom * (1 + zoomSpeed), 5) : Math.max(camera.zoom * (1 - zoomSpeed), 0.15);
    dispatch({ type: 'UPDATE_CAMERA', payload: { zoom: newZoom } });
  };

  const gridSizeW = settings.grid.width * camera.zoom;
  const gridSizeH = settings.grid.height * camera.zoom;
  const gridOffsetX = (camera.x % gridSizeW) + (viewportRef.current ? viewportRef.current.clientWidth / 2 : 0) % gridSizeW;
  const gridOffsetY = (camera.y % gridSizeH) + (viewportRef.current ? viewportRef.current.clientHeight / 2 : 0) % gridSizeH;

  const selectedObj = currentScene?.objects.find(o => selectedObjectIds.includes(o.id));

  return (
    <div 
      ref={viewportRef}
      className="flex-1 bg-gray-950 relative overflow-hidden"
      style={{ touchAction: 'none' }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, ${settings.grid.color}${Math.round(settings.grid.opacity * 255).toString(16).padStart(2,'0')} 1px, transparent 1px), linear-gradient(to bottom, ${settings.grid.color}${Math.round(settings.grid.opacity * 255).toString(16).padStart(2,'0')} 1px, transparent 1px)`,
          backgroundSize: `${gridSizeW}px ${gridSizeH}px`,
          backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`
        }}
      />

      {/* Game Frame */}
      <GameFrame settings={settings} camera={camera} />

      {/* World Objects Container */}
      <div className="absolute top-1/2 left-1/2" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, zIndex: 10 }}>
        {currentScene?.objects.filter(o => !o.hidden && !o._destroyed).map(obj => {
          const isSelected = selectedObjectIds.includes(obj.id);
          const isText = obj.type === 'Text';
          const hasCollider = obj.behaviors.some(b => b.type === 'BoxCollider');
          const colliderObj = obj.behaviors.find(b => b.type === 'BoxCollider');
          const spriteUrl = obj.rendering?.sprite ? state.project.assets.find(a => a.id === obj.rendering.sprite)?.url : null;

          return (
            <div key={obj.id}>
              {hasCollider && (
                <div 
                  className="absolute pointer-events-none" 
                  style={{ 
                    left: `${obj.transform.x}px`, 
                    top: `${obj.transform.y}px`, 
                    width: `${colliderObj?.width || obj.transform.w}px`, 
                    height: `${colliderObj?.height || obj.transform.h}px`, 
                    transform: `translate(-50%, -50%) rotate(${obj.transform.rotation}deg)`, 
                    border: '2.5px solid #10b981', 
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)',
                    zIndex: 5 
                  }} 
                />
              )}

              <div
                className="absolute flex items-center justify-center"
                style={{
                  left: `${obj.transform.x}px`, 
                  top: `${obj.transform.y}px`,
                  width: isText ? 'auto' : `${obj.transform.w}px`, 
                  height: isText ? 'auto' : `${obj.transform.h}px`,
                  backgroundColor: isText ? 'transparent' : (spriteUrl ? 'transparent' : obj.rendering.color), 
                  opacity: obj.rendering.opacity,
                  transform: `translate(-50%, -50%) rotate(${obj.transform.rotation}deg)`,
                  fontSize: `${obj.rendering.fontSize || 24}px`,
                  color: isText ? obj.rendering.color : undefined, 
                  textAlign: 'center', 
                  whiteSpace: 'nowrap',
                  pointerEvents: isPlaying ? 'none' : 'auto', 
                  zIndex: 10,
                  outline: isSelected && currentTool === 'select' ? '2px solid #3b82f6' : 'none',
                  outlineOffset: '2px',
                  backgroundImage: spriteUrl ? `url(${spriteUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {isText && <span style={{ color: obj.rendering.color, fontSize: `${obj.rendering.fontSize || 24}px` }}>{obj.rendering.text || obj.name}</span>}
                {obj.type === 'Audio' && <Music size={32} className="text-white opacity-50 animate-pulse" />}
                {obj.type === 'Sprite' && !isText && !spriteUrl && <Box size={24} className="text-white opacity-30" />}
                {obj.type === 'Empty' && <Circle size={16} className="text-gray-500 opacity-50" />}
                {obj.type === 'Particle' && <Sparkles size={24} className="text-yellow-400 opacity-60 animate-pulse" />}
              </div>
            </div>
          );
        })}

        {!isPlaying && selectedObj && (
           <TransformGizmo 
             object={selectedObj} 
             tool={currentTool} 
             camera={camera} 
             onInteractionStart={handleGizmoInteractionStart} 
           />
        )}
      </div>

      {isPlaying && (
        <div className="absolute inset-0 bg-black/25 pointer-events-none flex items-start justify-center pt-4 z-50">
          <div className="bg-green-600/90 text-white px-5 py-2 rounded-full text-xs font-bold tracking-widest flex items-center gap-2 shadow-lg">
            <PlayCircle size={16} /> LIVE TEST SIMULATOR
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-gray-900/90 px-3 py-1.5 rounded text-xs text-gray-400 pointer-events-none z-40 border border-gray-800">
        Zoom: {(camera.zoom * 100).toFixed(0)}% | Tool: {currentTool.toUpperCase()} {isPlaying ? '| PLAYING' : ''}
      </div>
    </div>
  );
};

// ==========================================
// --- HIERARCHY PANEL (FIXED CONTEXT MENU) ---
// ==========================================

const HierarchyPanel = () => {
  const { state, dispatch } = useContext(EngineContext);
  const currentScene = state.project.scenes.find(s => s.id === state.editor.activeSceneId);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const menuRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => { 
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowAddMenu(false); 
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // FIXED: Simple context menu without long press lag
  const handleContextMenu = useCallback((e, obj) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { icon: Edit3, label: 'Rename', onClick: () => { 
          const newName = prompt('Enter new name:', obj.name); 
          if (newName) dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { name: newName } } }); 
        }},
        { icon: Copy, label: 'Duplicate', onClick: () => dispatch({ type: 'DUPLICATE_OBJECT', payload: obj.id }) },
        { divider: true },
        { icon: obj.hidden ? Eye : EyeOff, label: obj.hidden ? 'Show' : 'Hide', onClick: () => dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { hidden: !obj.hidden } } }) },
        { icon: obj.locked ? Unlock : Lock, label: obj.locked ? 'Unlock' : 'Lock', onClick: () => dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { locked: !obj.locked } } }) },
        { divider: true },
        { icon: Trash2, label: 'Delete', danger: true, onClick: () => dispatch({ type: 'DELETE_OBJECT', payload: [obj.id] }) },
      ]
    });
  }, [dispatch]);

  const addObjectTypes = [
    { type: 'Sprite', icon: Box, label: 'Sprite' },
    { type: 'Text', icon: Type, label: 'Text' },
    { type: 'Empty', icon: Circle, label: 'Empty' },
    { type: 'Audio', icon: Music, label: 'Audio' },
    { type: 'Particle', icon: Sparkles, label: 'Particle' },
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full overflow-hidden shrink-0">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-gray-850">
        <div className="flex items-center gap-2 font-semibold text-gray-200"><Layers size={18} className="text-blue-400" /> Hierarchy</div>
        <div className="relative" ref={menuRef}>
          <IconButton icon={Plus} tooltip="Add Object" onClick={() => setShowAddMenu(!showAddMenu)} />
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[100] overflow-hidden">
              {addObjectTypes.map(({ type, icon: Icon, label }) => (
                <button key={type} onClick={() => { dispatch({ type: 'ADD_OBJECT', payload: { type } }); setShowAddMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {currentScene?.objects.map(obj => (
          <div 
            key={obj.id}
            onClick={() => !obj.locked && dispatch({ type: 'SELECT_OBJECT', payload: obj.id })}
            onContextMenu={(e) => handleContextMenu(e, obj)}
            className={`flex items-center justify-between p-2 rounded cursor-pointer mb-1 transition-colors ${state.editor.selectedObjectIds.includes(obj.id) ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300 hover:bg-gray-800'} ${obj.hidden ? 'opacity-50' : ''} ${obj.locked ? 'opacity-70' : ''}`}
          >
            <div className="flex items-center gap-2 truncate">
              {obj.type === 'Sprite' ? <Box size={14} /> : obj.type === 'Text' ? <Type size={14} /> : obj.type === 'Empty' ? <Circle size={14} /> : obj.type === 'Audio' ? <Music size={14} /> : obj.type === 'Particle' ? <Sparkles size={14} /> : <Box size={14}/>}
              <span className="text-sm truncate">{obj.name}</span>
            </div>
            <div className="flex items-center gap-1.5 opacity-60">
               <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { hidden: !obj.hidden } } }); }} className="text-gray-400 hover:text-white">{obj.hidden ? <EyeOff size={13}/> : <Eye size={13}/>}</button>
               <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_OBJECT', payload: { id: obj.id, updates: { locked: !obj.locked } } }); }} className="text-gray-400 hover:text-white">{obj.locked ? <Lock size={13}/> : <Unlock size={13}/>}</button>
            </div>
          </div>
        ))}
      </div>
      {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}
    </div>
  );
};

// ==========================================
// --- SPRITE PICKER MODAL ---
// ==========================================

const SpritePicker = ({ onSelect, onCancel, assets }) => {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const imageAssets = assets.filter(a => a.type === 'image');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999]" onClick={onCancel}>
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-[600px] max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><ImageIcon size={20} className="text-blue-400" /> Select Sprite</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {imageAssets.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <ImageIcon size={48} className="mx-auto mb-3 opacity-30" />
              <p>No images imported yet.</p>
              <p className="text-sm mt-1">Go to Assets to upload images first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              <button 
                onClick={() => setSelectedAsset(null)}
                className={`aspect-square bg-gray-900 border-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors ${selectedAsset === null ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500'}`}
              >
                <Box size={24} className="text-gray-500" />
                <span className="text-xs text-gray-400">None</span>
              </button>
              {imageAssets.map(asset => (
                <button 
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset.id)}
                  className={`aspect-square bg-gray-900 border-2 rounded-lg overflow-hidden flex flex-col items-center transition-colors ${selectedAsset === asset.id ? 'border-blue-500' : 'border-gray-700 hover:border-gray-500'}`}
                >
                  <div className="flex-1 w-full flex items-center justify-center p-1">
                    <img src={asset.url} alt={asset.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <span className="text-[10px] text-gray-400 truncate w-full text-center px-1 pb-1">{asset.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 transition-colors">Cancel</button>
          <button 
            onClick={() => onSelect(selectedAsset)}
            className="px-4 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// --- PROPERTIES PANEL (WITH SPRITE PICKER) ---
// ==========================================

const PropertiesPanel = () => {
  const { state, dispatch } = useContext(EngineContext);
  const currentScene = state.project.scenes.find(s => s.id === state.editor.activeSceneId);
  const selectedObj = currentScene?.objects.find(o => state.editor.selectedObjectIds.includes(o.id));

  const [showBehaviorMenu, setShowBehaviorMenu] = useState(false);
  const [showScriptMenu, setShowScriptMenu] = useState(false);
  const [showSpritePicker, setShowSpritePicker] = useState(false);

  if (!selectedObj) {
    return (
      <div className="w-72 bg-gray-900 border-l border-gray-800 p-6 flex flex-col items-center justify-center text-gray-500 text-center shrink-0">
        <MousePointer2 size={48} className="mb-4 opacity-20" />
        <p>Select an object to view its properties.</p>
      </div>
    );
  }

  const updateProp = (section, key, value) => {
    if (section === 'name') {
      dispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObj.id, updates: { name: value } } });
    } else {
      dispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObj.id, updates: { [section]: { ...selectedObj[section], [key]: value } } } });
    }
  };

  const availableScripts = state.project.scripts || [];
  const attachedScripts = selectedObj.scripts || [];
  const currentSprite = selectedObj.rendering?.sprite;
  const spriteAsset = currentSprite ? state.project.assets.find(a => a.id === currentSprite) : null;

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-hidden shrink-0">
      <div className="p-3 border-b border-gray-800 flex items-center gap-2 font-semibold text-gray-200 bg-gray-850"><Sliders size={18} className="text-green-400" /> Inspector</div>
      <div className="flex-1 overflow-y-auto pb-10">

        <PanelSection title="Object" icon={Box}>
          <MobileInput label="Name" value={selectedObj.name} onChange={v => updateProp('name', null, v)} type="text" />
          <div className="flex items-center justify-between mt-2">
            <label className="text-xs text-gray-400">Type</label>
            <span className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded">{selectedObj.type}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={() => updateProp('hidden', null, !selectedObj.hidden)} className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs ${selectedObj.hidden ? 'bg-gray-700 text-gray-400' : 'bg-gray-800 text-gray-300'}`}>
              {selectedObj.hidden ? <EyeOff size={12} /> : <Eye size={12} />} {selectedObj.hidden ? 'Hidden' : 'Visible'}
            </button>
            <button onClick={() => updateProp('locked', null, !selectedObj.locked)} className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs ${selectedObj.locked ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-800 text-gray-300'}`}>
              {selectedObj.locked ? <Lock size={12} /> : <Unlock size={12} />} {selectedObj.locked ? 'Locked' : 'Unlocked'}
            </button>
          </div>
        </PanelSection>

        <PanelSection title="Transform" icon={Move}>
          <div className="grid grid-cols-2 gap-2">
            <MobileInput label="X" value={Math.round(selectedObj.transform.x)} onChange={v => updateProp('transform', 'x', v)} type="number" />
            <MobileInput label="Y" value={Math.round(selectedObj.transform.y)} onChange={v => updateProp('transform', 'y', v)} type="number" />
            <MobileInput label="W" value={Math.round(selectedObj.transform.w)} onChange={v => updateProp('transform', 'w', v)} type="number" />
            <MobileInput label="H" value={Math.round(selectedObj.transform.h)} onChange={v => updateProp('transform', 'h', v)} type="number" />
          </div>
          <MobileInput label="Rotation" value={Math.round(selectedObj.transform.rotation)} onChange={v => updateProp('transform', 'rotation', v)} type="number" />
        </PanelSection>

        <PanelSection title="Rendering" icon={Sun}>
          {/* Sprite Picker */}
          <div className="mb-3">
            <label className="text-xs text-gray-400 block mb-1.5">Sprite</label>
            <button 
              onClick={() => setShowSpritePicker(true)}
              className="w-full flex items-center gap-2 p-2 bg-gray-900 border border-gray-700 rounded-lg hover:border-blue-500 transition-colors"
            >
              {spriteAsset ? (
                <>
                  <img src={spriteAsset.url} alt="" className="w-8 h-8 rounded object-cover" />
                  <span className="text-sm text-gray-300 truncate flex-1">{spriteAsset.name}</span>
                </>
              ) : (
                <>
                  <Box size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-400">No Sprite (Color)</span>
                </>
              )}
              <ChevronRight size={14} className="text-gray-500" />
            </button>
          </div>

          {!currentSprite && <ColorInput label="Color" value={selectedObj.rendering.color} onChange={v => updateProp('rendering', 'color', v)} />}
          <MobileInput label="Opacity" value={selectedObj.rendering.opacity} onChange={v => updateProp('rendering', 'opacity', v)} min={0} max={1} step={0.1} type="number" />
          {selectedObj.type === 'Text' && (
            <>
              <MobileInput label="Text" value={selectedObj.rendering.text || ''} onChange={v => updateProp('rendering', 'text', v)} type="text" />
              <MobileInput label="Font Size" value={selectedObj.rendering.fontSize || 24} onChange={v => updateProp('rendering', 'fontSize', v)} type="number" />
            </>
          )}
        </PanelSection>

        <PanelSection title="Behaviors" icon={Activity}>
          {selectedObj.behaviors.map(b => (
            <BehaviorItem key={b.id} behavior={b} objectId={selectedObj.id} />
          ))}
          <div className="relative mt-2">
            <button className="w-full py-1.5 bg-gray-800 hover:bg-gray-750 text-sm text-gray-300 rounded border border-gray-700 flex items-center justify-center gap-1" onClick={() => setShowBehaviorMenu(!showBehaviorMenu)}>
              <Plus size={14} /> Add Behavior
            </button>
            {showBehaviorMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[100] overflow-hidden">
                <button onClick={() => { dispatch({ type: 'ADD_BEHAVIOR', payload: { objectId: selectedObj.id, behaviorType: 'Physics2D', behaviorData: { gravity: 9.8, bodyType: 'Dynamic', density: 1, bounce: 0.3, friction: 0.3 } } }); setShowBehaviorMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                  <Zap size={14} /> Physics 2D
                </button>
                <button onClick={() => { dispatch({ type: 'ADD_BEHAVIOR', payload: { objectId: selectedObj.id, behaviorType: 'BoxCollider', behaviorData: { width: selectedObj.transform.w, height: selectedObj.transform.h, offsetX: 0, offsetY: 0 } } }); setShowBehaviorMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                  <Maximize size={14} /> Box Collider
                </button>
                <button onClick={() => { dispatch({ type: 'ADD_BEHAVIOR', payload: { objectId: selectedObj.id, behaviorType: 'Platformer', behaviorData: { speed: 5, jumpForce: 10, maxJumps: 1 } } }); setShowBehaviorMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                  <ArrowUp size={14} /> Platformer
                </button>
              </div>
            )}
          </div>
        </PanelSection>

        <PanelSection title="Visual Scripts" icon={Code}>
          {attachedScripts.map(s => (
            <div key={s.id} className="bg-gray-900 border border-gray-700 rounded mb-2 overflow-hidden">
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => dispatch({ type: 'TOGGLE_OBJECT_SCRIPT', payload: { objectId: selectedObj.id, scriptRefId: s.id } })} className={`w-4 h-4 rounded border ${s.enabled ? 'bg-green-500 border-green-500' : 'border-gray-500'}`} />
                  <span className={`text-xs truncate max-w-[100px] ${s.enabled ? 'text-gray-300' : 'text-gray-500'}`}>{s.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => dispatch({ type: 'SET_EDITING_SCRIPT', payload: s.scriptId })} className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
                     Open Editor
                  </button>
                  <Trash2 size={14} className="text-gray-500 hover:text-red-400 cursor-pointer" onClick={() => dispatch({ type: 'REMOVE_OBJECT_SCRIPT', payload: { objectId: selectedObj.id, scriptRefId: s.id } })} />
                </div>
              </div>
            </div>
          ))}
          <div className="relative">
            <button className="w-full mt-2 py-1 bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 rounded border border-gray-700 flex items-center justify-center gap-1" onClick={() => setShowScriptMenu(!showScriptMenu)}>
              <Plus size={14} /> Attach Script
            </button>
            {showScriptMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-[100] overflow-hidden max-h-40 overflow-y-auto">
                {availableScripts.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No scripts available</div>}
                {availableScripts.map(script => (
                  <button key={script.id} onClick={() => { dispatch({ type: 'ADD_OBJECT_SCRIPT', payload: { objectId: selectedObj.id, scriptId: script.id } }); setShowScriptMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                    <Code size={14} /> {script.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PanelSection>
      </div>

      {showSpritePicker && (
        <SpritePicker 
          assets={state.project.assets}
          onSelect={(assetId) => {
            dispatch({ type: 'UPDATE_OBJECT', payload: { id: selectedObj.id, updates: { rendering: { ...selectedObj.rendering, sprite: assetId } } } });
            setShowSpritePicker(false);
          }}
          onCancel={() => setShowSpritePicker(false)}
        />
      )}
    </div>
  );
};

const BehaviorItem = ({ behavior, objectId }) => {
  const { dispatch } = useContext(EngineContext);
  const [expanded, setExpanded] = useState(false);
  const updateBehavior = (updates) => dispatch({ type: 'UPDATE_BEHAVIOR', payload: { objectId, behaviorId: behavior.id, updates } });

  return (
    <div className="bg-gray-900 border border-gray-700 rounded mb-2 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-2 hover:bg-gray-800 transition-colors">
        <div className="flex items-center gap-2">
          {behavior.type === 'Physics2D' && <Zap size={14} className="text-yellow-400" />}
          {behavior.type === 'BoxCollider' && <Maximize size={14} className="text-green-400" />}
          {behavior.type === 'Platformer' && <ArrowUp size={14} className="text-blue-400" />}
          <span className="text-sm text-gray-300">{behavior.type}</span>
        </div>
        <div className="flex items-center gap-1">
          {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
          <Trash2 size={14} className="text-gray-500 hover:text-red-400 cursor-pointer ml-1" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_BEHAVIOR', payload: { objectId, behaviorId: behavior.id } }); }} />
        </div>
      </button>

      {expanded && (
        <div className="p-2 border-t border-gray-700">
          {behavior.type === 'Physics2D' && (
            <>
              <MobileInput label="Gravity" value={behavior.gravity !== undefined ? behavior.gravity : 9.8} onChange={v => updateBehavior({ gravity: v })} type="number" />
              <div className="mb-2">
                <label className="text-xs text-gray-400 block mb-1">Body Type</label>
                <div className="flex gap-1">
                  {['Dynamic', 'Static', 'Kinematic'].map(t => (
                    <button key={t} onClick={() => updateBehavior({ bodyType: t })} className={`flex-1 py-1 text-xs rounded ${behavior.bodyType === t ? 'bg-blue-600 text-white font-bold' : 'bg-gray-850 text-gray-400 hover:bg-gray-700'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <MobileInput label="Bounce" value={behavior.bounce !== undefined ? behavior.bounce : 0.3} onChange={v => updateBehavior({ bounce: v })} min={0} max={1} step={0.1} type="number" />
              <MobileInput label="Friction" value={behavior.friction !== undefined ? behavior.friction : 0.5} onChange={v => updateBehavior({ friction: v })} min={0} max={1} step={0.1} type="number" />
            </>
          )}
          {behavior.type === 'BoxCollider' && (
            <>
              <MobileInput label="Width" value={behavior.width || 64} onChange={v => updateBehavior({ width: v })} type="number" />
              <MobileInput label="Height" value={behavior.height || 64} onChange={v => updateBehavior({ height: v })} type="number" />
              <MobileInput label="Offset X" value={behavior.offsetX || 0} onChange={v => updateBehavior({ offsetX: v })} type="number" />
              <MobileInput label="Offset Y" value={behavior.offsetY || 0} onChange={v => updateBehavior({ offsetY: v })} type="number" />
            </>
          )}
          {behavior.type === 'Platformer' && (
            <>
              <MobileInput label="Speed" value={behavior.speed || 5} onChange={v => updateBehavior({ speed: v })} type="number" />
              <MobileInput label="Jump Force" value={behavior.jumpForce || 10} onChange={v => updateBehavior({ jumpForce: v })} type="number" />
              <MobileInput label="Max Jumps" value={behavior.maxJumps || 1} onChange={v => updateBehavior({ maxJumps: v })} type="number" />
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// --- VISUAL SCRIPTING EDITOR (FIXED) ---
// ==========================================

const NODE_WIDTH = 180;
const NODE_HEADER_HEIGHT = 32;
const PORT_RADIUS = 6;
const SNAP_DISTANCE = 40;

const EVENT_NODES = [
  { type: 'Event', name: 'Game Start', color: '#ef4444', dataType: 'execution' },
  { type: 'Event', name: 'Every Frame', color: '#ef4444', dataType: 'execution' },
  { type: 'Event', name: 'On Collision', color: '#ef4444', dataType: 'execution' },
  { type: 'Event', name: 'On Input', color: '#ef4444', dataType: 'execution', defaultParams: { key: 'Space' } },
];

const ACTION_NODES = [
  { type: 'Action', name: 'Move Object', color: '#a855f7', dataType: 'execution', defaultParams: { x: 0, y: 0 }, editable: true },
  { type: 'Action', name: 'Add To X', color: '#a855f7', dataType: 'execution', defaultParams: { value: 1 }, editable: true },
  { type: 'Action', name: 'Add To Y', color: '#a855f7', dataType: 'execution', defaultParams: { value: 1 }, editable: true },
  { type: 'Action', name: 'Set Position', color: '#a855f7', dataType: 'execution', defaultParams: { x: 0, y: 0 }, editable: true },
  { type: 'Action', name: 'Set Rotation', color: '#a855f7', dataType: 'execution', defaultParams: { value: 0 }, editable: true },
  { type: 'Action', name: 'Set Scale', color: '#a855f7', dataType: 'execution', defaultParams: { w: 64, h: 64 }, editable: true },
  { type: 'Action', name: 'Set Opacity', color: '#a855f7', dataType: 'execution', defaultParams: { value: 1 }, editable: true },
  { type: 'Action', name: 'Play Sound', color: '#a855f7', dataType: 'execution' },
  { type: 'Action', name: 'Destroy', color: '#a855f7', dataType: 'execution' },
];

const getDataTypeColor = (dataType) => {
  switch(dataType) {
    case 'execution': return '#ef4444';
    case 'number': return '#3b82f6';
    case 'boolean': return '#22c55e';
    case 'string': return '#eab308';
    default: return '#9ca3af';
  }
};

const VisualScriptingScreen = () => {
  const { state, dispatch } = useContext(EngineContext);
  const activeScript = state.project.scripts.find(s => s.id === state.editor.activeEditingScriptId) || state.project.scripts[0];

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [draggingNodes, setDraggingNodes] = useState(new Set());
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [expandedNodes, setExpandedNodes] = useState({});
  const [showNodeMenu, setShowNodeMenu] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEventsPanel, setShowEventsPanel] = useState(true);
  const [showActionsPanel, setShowActionsPanel] = useState(true);
  const [scriptName, setScriptName] = useState(activeScript?.name || '');
  const [isRenaming, setIsRenaming] = useState(false);

  const canvasRef = useRef(null);
  const isPanning = useRef(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const pinchState = useRef({ initialDist: 0, initialZoom: 1, lastCenter: { x: 0, y: 0 } });
  const dragStartPos = useRef({});
  const lastTouchTime = useRef(0);

  const screenToCanvas = useCallback((sx, sy) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - rect.width / 2 - camera.x) / camera.zoom,
      y: (sy - rect.top - rect.height / 2 - camera.y) / camera.zoom
    };
  }, [camera]);

  // FIXED: Proper port positions for clean bezier connections
  const getNodePortPos = useCallback((nodeId, isOutput) => {
    const node = activeScript?.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    // Output port on right side, input on left
    return { 
      x: node.x + (isOutput ? NODE_WIDTH : 0), 
      y: node.y + NODE_HEADER_HEIGHT / 2 
    };
  }, [activeScript]);

  const findNearbyPort = useCallback((cx, cy) => {
    if (!activeScript) return null;
    for (const node of activeScript.nodes) {
      const inputPos = getNodePortPos(node.id, false);
      const distInput = Math.hypot(inputPos.x - cx, inputPos.y - cy);
      if (distInput < SNAP_DISTANCE && node.type !== 'Event') {
        return { nodeId: node.id, isOutput: false, pos: inputPos };
      }
      const outputPos = getNodePortPos(node.id, true);
      const distOutput = Math.hypot(outputPos.x - cx, outputPos.y - cy);
      if (distOutput < SNAP_DISTANCE) {
        return { nodeId: node.id, isOutput: true, pos: outputPos };
      }
    }
    return null;
  }, [activeScript, getNodePortPos]);

  const handleCanvasPointerDown = (e) => {
    const now = Date.now();
    const isDoubleTap = now - lastTouchTime.current < 300;
    lastTouchTime.current = now;

    if (e.touches && e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchState.current.initialDist = Math.hypot(dx, dy);
      pinchState.current.initialZoom = camera.zoom;
      pinchState.current.lastCenter = { 
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2, 
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 
      };
      return;
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const canvasPos = screenToCanvas(clientX, clientY);

    // Check port click
    const nearbyPort = findNearbyPort(canvasPos.x, canvasPos.y);
    if (nearbyPort && !nearby.isOutput && connectingFrom) {
      createConnection(connectingFrom.nodeId, nearbyPort.nodeId);
      setConnectingFrom(null);
      return;
    } else if (nearbyPort && nearbyPort.isOutput) {
      setConnectingFrom({ nodeId: nearbyPort.nodeId, isOutput: true });
      return;
    }

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      lastPanPos.current = { x: clientX, y: clientY };
      return;
    }

    // Check node click
    const clickedNode = activeScript?.nodes.find(n => 
      canvasPos.x >= n.x - 10 && canvasPos.x <= n.x + NODE_WIDTH + 10 &&
      canvasPos.y >= n.y - 10 && canvasPos.y <= n.y + NODE_HEADER_HEIGHT + (expandedNodes[n.id] ? 120 : 0) + 10
    );

    if (clickedNode) {
      if (isDoubleTap) {
        setEditingNode(clickedNode.id);
        return;
      }

      if (e.shiftKey) {
        setSelectedNodes(prev => {
          const next = new Set(prev);
          if (next.has(clickedNode.id)) next.delete(clickedNode.id);
          else next.add(clickedNode.id);
          return next;
        });
      } else if (!selectedNodes.has(clickedNode.id)) {
        setSelectedNodes(new Set([clickedNode.id]));
      }

      const nodesToDrag = selectedNodes.has(clickedNode.id) ? selectedNodes : new Set([clickedNode.id]);
      setDraggingNodes(nodesToDrag);

      dragStartPos.current = {};
      nodesToDrag.forEach(id => {
        const n = activeScript.nodes.find(nn => nn.id === id);
        if (n) dragStartPos.current[id] = { x: n.x, y: n.y, screenX: clientX, screenY: clientY };
      });
    } else {
      if (connectingFrom) {
        setShowNodeMenu({ x: clientX, y: clientY, canvasX: canvasPos.x, canvasY: canvasPos.y });
        setConnectingFrom(null);
      } else {
        setSelectedNodes(new Set());
      }
    }
  };

  const handleCanvasPointerMove = (e) => {
    if (e.touches && e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const center = { 
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2, 
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 
      };

      const newZoom = Math.max(0.2, Math.min(3, pinchState.current.initialZoom * (dist / pinchState.current.initialDist)));
      const panDx = center.x - pinchState.current.lastCenter.x;
      const panDy = center.y - pinchState.current.lastCenter.y;

      setCamera(prev => ({ ...prev, zoom: newZoom, x: prev.x + panDx, y: prev.y + panDy }));
      pinchState.current.lastCenter = center;
      return;
    }

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const canvasPos = screenToCanvas(clientX, clientY);
    setMousePos(canvasPos);

    if (isPanning.current) {
      const dx = clientX - lastPanPos.current.x;
      const dy = clientY - lastPanPos.current.y;
      setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: clientX, y: clientY };
    }

    if (draggingNodes.size > 0 && activeScript) {
      const firstNodeId = Array.from(draggingNodes)[0];
      const startData = dragStartPos.current[firstNodeId];
      if (!startData) return;

      const startCanvas = screenToCanvas(startData.screenX, startData.screenY);

      const updatedNodes = activeScript.nodes.map(n => {
        if (draggingNodes.has(n.id)) {
          const start = dragStartPos.current[n.id];
          if (start) {
            return { 
              ...n, 
              x: start.x + (canvasPos.x - startCanvas.x),
              y: start.y + (canvasPos.y - startCanvas.y)
            };
          }
        }
        return n;
      });
      dispatch({ type: 'UPDATE_SCRIPT', payload: { id: activeScript.id, updates: { nodes: updatedNodes } } });
    }

    // Auto-pan
    if ((draggingNodes.size > 0 || connectingFrom) && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const edgeThreshold = 50;
      let panDx = 0, panDy = 0;

      if (clientX - rect.left < edgeThreshold) panDx = 5;
      if (rect.right - clientX < edgeThreshold) panDx = -5;
      if (clientY - rect.top < edgeThreshold) panDy = 5;
      if (rect.bottom - clientY < edgeThreshold) panDy = -5;

      if (panDx !== 0 || panDy !== 0) {
        setCamera(prev => ({ ...prev, x: prev.x + panDx, y: prev.y + panDy }));
      }
    }
  };

  const handleCanvasPointerUp = () => { 
    isPanning.current = false; 
    setDraggingNodes(new Set());
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = e.deltaY < 0 ? Math.min(camera.zoom * (1 + zoomSpeed), 3) : Math.max(camera.zoom * (1 - zoomSpeed), 0.2);
    setCamera(prev => ({ ...prev, zoom: newZoom }));
  };

  const createConnection = (fromId, toId) => {
    if (!activeScript || fromId === toId) return;
    const exists = activeScript.connections.some(c => c.from === fromId && c.to === toId);
    if (!exists) {
      dispatch({ 
        type: 'UPDATE_SCRIPT', 
        payload: { 
          id: activeScript.id, 
          updates: { 
            connections: [...activeScript.connections, { from: fromId, to: toId, fromPort: 'out', toPort: 'in' }] 
          } 
        } 
      });
    }
  };

  const addNode = (template, connectTo = null, canvasX = null, canvasY = null) => {
    if (!activeScript) return;
    const x = canvasX !== null ? canvasX - NODE_WIDTH / 2 : -camera.x / camera.zoom + 50 + Math.random() * 50;
    const y = canvasY !== null ? canvasY - NODE_HEADER_HEIGHT / 2 : -camera.y / camera.zoom + 50 + Math.random() * 50;

    const newNode = { 
      id: generateId(), 
      type: template.type, 
      name: template.name, 
      x, 
      y, 
      params: template.defaultParams ? { ...template.defaultParams } : {},
      dataType: template.dataType || 'execution',
    };

    const newConnections = [...activeScript.connections];
    if (connectTo) {
      newConnections.push({ from: connectTo, to: newNode.id, fromPort: 'out', toPort: 'in' });
    }

    dispatch({ 
      type: 'UPDATE_SCRIPT', 
      payload: { 
        id: activeScript.id, 
        updates: { 
          nodes: [...activeScript.nodes, newNode],
          connections: newConnections
        } 
      } 
    });

    setShowNodeMenu(null);
    setConnectingFrom(null);
  };

  const deleteNode = (nodeId) => {
    if (!activeScript) return;
    dispatch({ 
      type: 'UPDATE_SCRIPT', 
      payload: { 
        id: activeScript.id, 
        updates: { 
          nodes: activeScript.nodes.filter(n => n.id !== nodeId), 
          connections: activeScript.connections.filter(c => c.from !== nodeId && c.to !== nodeId) 
        } 
      } 
    });
    setSelectedNodes(prev => { const next = new Set(prev); next.delete(nodeId); return next; });
  };

  const deleteConnection = (index) => {
    if (!activeScript) return;
    dispatch({ 
      type: 'UPDATE_SCRIPT', 
      payload: { 
        id: activeScript.id, 
        updates: { 
          connections: activeScript.connections.filter((_, i) => i !== index) 
        } 
      } 
    });
  };

  const updateNodeParam = (nodeId, key, value) => {
    if (!activeScript) return;
    const updatedNodes = activeScript.nodes.map(n => 
      n.id === nodeId ? { ...n, params: { ...n.params, [key]: value } } : n 
    );
    dispatch({ type: 'UPDATE_SCRIPT', payload: { id: activeScript.id, updates: { nodes: updatedNodes } } });
  };

  const toggleNodeExpanded = (nodeId) => setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));

  const handleRenameScript = () => {
    if (scriptName.trim() && activeScript) {
      dispatch({ type: 'RENAME_SCRIPT', payload: { id: activeScript.id, name: scriptName.trim() } });
    }
    setIsRenaming(false);
  };

  // FIXED: Clean bezier curve calculation
  const getBezierPath = (from, to) => {
    const dx = Math.abs(to.x - from.x);
    const controlOffset = Math.max(dx * 0.5, 50);
    return `M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`;
  };

  if (!activeScript) {
    return (
      <div className="flex flex-col h-full bg-gray-900 w-full items-center justify-center text-gray-500">
        <Code size={48} className="mb-4 opacity-20" />
        <p>No active script. Attach or select a visual script inside properties to view.</p>
        <button onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'SCENE_EDITOR' })} className="mt-4 text-blue-400 hover:text-blue-300">Back to Editor</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 w-full relative select-none">
      {/* Header */}
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-950 shrink-0">
        <div className="flex items-center gap-4">
           <button onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'SCENE_EDITOR' })} className="text-gray-400 hover:text-white flex items-center gap-1 font-bold">
             <ChevronRight size={18} className="rotate-180" /> Back to Workspace
           </button>
           <div className="flex items-center gap-2">
             <Code size={18} className="text-purple-400"/>
             {isRenaming ? (
               <input 
                 autoFocus
                 value={scriptName}
                 onChange={e => setScriptName(e.target.value)}
                 onBlur={handleRenameScript}
                 onKeyDown={e => { if (e.key === 'Enter') handleRenameScript(); }}
                 className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white w-40"
               />
             ) : (
               <h2 
                 className="text-gray-200 font-bold cursor-pointer hover:text-purple-400 transition-colors"
                 onClick={() => { setScriptName(activeScript.name); setIsRenaming(true); }}
                 title="Click to rename"
               >
                 {activeScript.name}
               </h2>
             )}
           </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton 
            icon={PanelLeft} 
            tooltip="Toggle Events Panel" 
            active={showEventsPanel}
            onClick={() => setShowEventsPanel(!showEventsPanel)} 
          />
          <IconButton 
            icon={PanelRight} 
            tooltip="Toggle Actions Panel" 
            active={showActionsPanel}
            onClick={() => setShowActionsPanel(!showActionsPanel)} 
          />
          <div className="h-5 w-px bg-gray-700 mx-1"></div>
          <div className="text-xs text-gray-500 mr-2">Zoom: {(camera.zoom * 100).toFixed(0)}%</div>
          <IconButton icon={ZoomIn} tooltip="Zoom In" onClick={() => setCamera(p => ({ ...p, zoom: Math.min(p.zoom * 1.2, 3) }))} />
          <IconButton icon={ZoomOut} tooltip="Zoom Out" onClick={() => setCamera(p => ({ ...p, zoom: Math.max(p.zoom / 1.2, 0.2) }))} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Events Panel (Left) */}
        <div className={`border-r border-gray-800 bg-gray-850 overflow-y-auto shrink-0 transition-all duration-200 ${showEventsPanel ? 'w-56 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
          <div className="p-3">
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Events</h3>
            <div className="space-y-1.5">
              {EVENT_NODES.map(node => (
                <div 
                  key={node.name} 
                  onClick={() => addNode(node)} 
                  className="bg-gray-800 p-2.5 rounded border border-gray-700 text-gray-300 text-sm cursor-pointer hover:border-red-500 transition-colors flex items-center gap-2"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                  <span className="truncate">{node.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={canvasRef} 
          className="flex-1 relative bg-gray-900 overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleCanvasPointerDown} 
          onMouseMove={handleCanvasPointerMove} 
          onMouseUp={handleCanvasPointerUp} 
          onMouseLeave={handleCanvasPointerUp}
          onTouchStart={handleCanvasPointerDown} 
          onTouchMove={handleCanvasPointerMove} 
          onTouchEnd={handleCanvasPointerUp} 
          onWheel={handleWheel}
          style={{ 
            touchAction: 'none',
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`, 
            backgroundSize: `${20 * camera.zoom}px ${20 * camera.zoom}px` 
          }}
        >
          {/* SVG Connections Layer - FIXED positioning */}
          <svg 
            className="absolute inset-0 pointer-events-none w-full h-full" 
            style={{ 
              transform: `translate(${camera.x + (canvasRef.current?.clientWidth || 0) / 2}px, ${camera.y + (canvasRef.current?.clientHeight || 0) / 2}px) scale(${camera.zoom})`,
              zIndex: 1
            }}
          >
            {/* Existing connections */}
            {activeScript.connections.map((conn, i) => {
               const from = getNodePortPos(conn.from, true); 
               const to = getNodePortPos(conn.to, false);
               const fromNode = activeScript.nodes.find(n => n.id === conn.from);
               const dataType = fromNode?.dataType || 'execution';
               const color = getDataTypeColor(dataType);

               return (
                 <g key={i}>
                   <path 
                     d={getBezierPath(from, to)}
                     fill="none" 
                     stroke={color} 
                     strokeWidth="2.5" 
                     opacity="0.8"
                     className="pointer-events-auto cursor-pointer hover:stroke-red-500 transition-colors"
                     onClick={() => deleteConnection(i)}
                     style={{ pointerEvents: 'stroke' }}
                   />
                   {/* Wide hit area */}
                   <path 
                     d={getBezierPath(from, to)}
                     fill="none" 
                     stroke="transparent" 
                     strokeWidth="12"
                     className="pointer-events-auto cursor-pointer"
                     onClick={() => deleteConnection(i)}
                   />
                 </g>
               );
            })}

            {/* Active connection being dragged */}
            {connectingFrom && (
              <path 
                d={getBezierPath(
                  getNodePortPos(connectingFrom.nodeId, true),
                  mousePos
                )}
                fill="none" 
                stroke={getDataTypeColor(activeScript.nodes.find(n => n.id === connectingFrom.nodeId)?.dataType || 'execution')} 
                strokeWidth="2" 
                strokeDasharray="6,4" 
                opacity="0.7" 
              />
            )}
          </svg>

          {/* Nodes Layer */}
          <div 
            className="absolute top-1/2 left-1/2" 
            style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`, zIndex: 2 }}
          >
            {activeScript.nodes.map(node => {
              const isSelected = selectedNodes.has(node.id);
              const isEvent = node.type === 'Event';
              const isExpanded = expandedNodes[node.id];
              const hasEditableParams = node.params && Object.keys(node.params).length > 0;
              const dataTypeColor = getDataTypeColor(node.dataType);

              return (
                <div 
                  key={node.id} 
                  className={`absolute bg-gray-800 border rounded-lg shadow-xl select-none transition-shadow ${isSelected ? 'border-blue-400 shadow-blue-400/20' : 'border-gray-700'}`}
                  style={{ 
                    left: node.x, 
                    top: node.y, 
                    width: NODE_WIDTH,
                    zIndex: isSelected ? 10 : 1
                  }} 
                  onMouseDown={(e) => { 
                    if (e.button === 0 && !e.target.closest('.port') && !e.target.closest('.node-action')) {
                      // Handled by canvas
                    }
                  }} 
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items: [
                        { icon: Copy, label: 'Duplicate', onClick: () => {
                          const newNode = { ...JSON.parse(JSON.stringify(node)), id: generateId(), x: node.x + 30, y: node.y + 30 };
                          dispatch({ type: 'UPDATE_SCRIPT', payload: { id: activeScript.id, updates: { nodes: [...activeScript.nodes, newNode] } } });
                        }},
                        { divider: true },
                        { icon: Trash2, label: 'Delete', danger: true, onClick: () => deleteNode(node.id) },
                      ]
                    });
                  }}
                >
                  {/* Header - Draggable area */}
                  <div 
                    className="p-2 rounded-t-lg text-sm font-bold text-white flex items-center justify-between cursor-grab active:cursor-grabbing"
                    style={{ backgroundColor: node.color || '#6b7280' }}
                  >
                    <div className="flex items-center gap-2 pointer-events-none">
                      {node.type === 'Event' && <Activity size={14}/>}
                      {node.type === 'Action' && <Zap size={14}/>}
                      <span className="truncate">{node.name}</span>
                    </div>
                    <X size={12} className="cursor-pointer hover:text-red-300 opacity-70 hover:opacity-100 node-action" onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} />
                  </div>

                  {/* Parameters */}
                  {hasEditableParams && (
                    <div className="px-2 py-1 border-b border-gray-700">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleNodeExpanded(node.id); }} 
                        className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 w-full node-action"
                      >
                        {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />} Parameters
                      </button>
                      {isExpanded && (
                        <div className="mt-1 space-y-1 pb-2">
                          {Object.entries(node.params).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-1">
                              <span className="text-xs text-gray-500 w-10 truncate">{key}:</span>
                              <input 
                                type={typeof val === 'number' ? 'number' : 'text'} 
                                value={val} 
                                onChange={(e) => updateNodeParam(node.id, key, typeof val === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)} 
                                onClick={(e) => e.stopPropagation()} 
                                className="flex-1 bg-gray-900 border border-gray-600 rounded px-1 py-0.5 text-xs text-gray-200 node-action"
                                style={{ fontSize: '12px' }} 
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Output Port - Right side */}
                  <div 
                    className="port absolute top-1/2 -right-2 w-4 h-4 rounded-full border-2 border-gray-800 transform -translate-y-1/2 cursor-crosshair transition-transform hover:scale-125"
                    style={{ 
                      backgroundColor: dataTypeColor,
                      boxShadow: connectingFrom?.nodeId === node.id ? `0 0 8px ${dataTypeColor}` : 'none'
                    }}
                    onMouseDown={(e) => { e.stopPropagation(); setConnectingFrom({ nodeId: node.id, isOutput: true }); }}
                    onTouchStart={(e) => { e.stopPropagation(); setConnectingFrom({ nodeId: node.id, isOutput: true }); }}
                  />

                  {/* Input Port - Left side */}
                  {!isEvent && (
                    <div 
                      className="port absolute top-1/2 -left-2 w-4 h-4 rounded-full border-2 border-gray-800 transform -translate-y-1/2 cursor-crosshair transition-transform hover:scale-125"
                      style={{ 
                        backgroundColor: dataTypeColor,
                        boxShadow: (() => {
                          const nearby = findNearbyPort(mousePos.x, mousePos.y);
                          return nearby && nearby.nodeId === node.id && !nearby.isOutput ? `0 0 8px ${dataTypeColor}` : 'none';
                        })()
                      }}
                      onMouseDown={(e) => { 
                        e.stopPropagation(); 
                        if (connectingFrom) {
                          createConnection(connectingFrom.nodeId, node.id);
                          setConnectingFrom(null);
                        }
                      }}
                      onTouchStart={(e) => { 
                        e.stopPropagation(); 
                        if (connectingFrom) {
                          createConnection(connectingFrom.nodeId, node.id);
                          setConnectingFrom(null);
                        }
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Connection hint */}
          {connectingFrom && (
            <div className="absolute top-4 right-4 bg-purple-600/90 text-white px-3 py-2 rounded-lg text-xs shadow-lg z-50">
              <div className="font-semibold mb-1">Release to create node</div>
              <div className="text-purple-200 text-[10px]">or drag to an input port</div>
            </div>
          )}

          {/* Node Creation Menu */}
          {showNodeMenu && (
            <div 
              className="absolute bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-[100] overflow-hidden"
              style={{ 
                left: Math.min(showNodeMenu.x, window.innerWidth - 200), 
                top: Math.min(showNodeMenu.y, window.innerHeight - 300),
                width: 180
              }}
            >
              <div className="p-2 border-b border-gray-700 text-xs text-gray-500 uppercase font-semibold">Create Node</div>
              <div className="max-h-64 overflow-y-auto p-1">
                {[...EVENT_NODES, ...ACTION_NODES].map(node => (
                  <button 
                    key={node.name} 
                    onClick={() => addNode(node, connectingFrom?.nodeId, showNodeMenu.canvasX, showNodeMenu.canvasY)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color }} />
                    {node.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Node Edit Modal */}
          {editingNode && (() => {
            const node = activeScript.nodes.find(n => n.id === editingNode);
            if (!node) return null;
            return (
              <div 
                className="absolute inset-0 bg-black/50 flex items-center justify-center z-[200]"
                onClick={() => setEditingNode(null)}
              >
                <div 
                  className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-80 shadow-2xl"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-lg font-bold text-white mb-4">Edit {node.name}</h3>
                  <div className="space-y-3">
                    {Object.entries(node.params).map(([key, val]) => (
                      <div key={key}>
                        <label className="text-xs text-gray-400 block mb-1">{key}</label>
                        <input 
                          type={typeof val === 'number' ? 'number' : 'text'}
                          value={val}
                          onChange={(e) => updateNodeParam(node.id, key, typeof val === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setEditingNode(null)}
                    className="w-full mt-4 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Context Menu */}
          {contextMenu && (
            <ContextMenu 
              {...contextMenu} 
              onClose={() => setContextMenu(null)} 
            />
          )}
        </div>

        {/* Actions Panel (Right) */}
        <div className={`border-l border-gray-800 bg-gray-850 overflow-y-auto shrink-0 transition-all duration-200 ${showActionsPanel ? 'w-56 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
          <div className="p-3">
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Actions</h3>
            <div className="space-y-1.5">
              {ACTION_NODES.map(node => (
                <div 
                  key={node.name} 
                  onClick={() => addNode(node)} 
                  className="bg-gray-800 p-2.5 rounded border border-gray-700 text-gray-300 text-sm cursor-pointer hover:border-purple-500 transition-colors flex items-center gap-2"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                  <span className="truncate">{node.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// --- ASSETS SCREEN ---
// ==========================================

const AssetsScreen = () => {
  const { state, dispatch } = useContext(EngineContext);
  const [activeTab, setActiveTab] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);

  const assets = state.project.assets || [];
  const filteredAssets = activeTab === 'all' ? assets : assets.filter(a => a.type === activeTab);

  const getIcon = (type) => {
    switch(type) { case 'image': return ImageIcon; case 'audio': return Volume2; case 'video': return Film; case 'font': return Type; default: return FileText; }
  };

  const handleFileUpload = (e) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : 'file';
      const reader = new FileReader();
      reader.onload = (event) => { dispatch({ type: 'ADD_ASSET', payload: { name: file.name, type, url: event.target.result } }); };
      reader.readAsDataURL(file);
    });
    setShowUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getAssetMenuItems = (asset) => [
    { icon: Edit3, label: 'Rename', onClick: () => { const newName = prompt('Enter new name:', asset.name); if (newName) { const updatedAssets = assets.map(a => a.id === asset.id ? { ...a, name: newName } : a); dispatch({ type: 'APPLY_SCRIPT_CHANGES', payload: { assets: updatedAssets } }); }}},
    { divider: true },
    { icon: Trash2, label: 'Delete', danger: true, onClick: () => dispatch({ type: 'DELETE_ASSET', payload: asset.id }) },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 w-full select-none">
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-950">
        <div className="flex items-center gap-4">
           <button onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'SCENE_EDITOR' })} className="text-gray-400 hover:text-white flex items-center gap-1"><ChevronRight size={18} className="rotate-180" /> Back</button>
           <h2 className="text-gray-200 font-bold flex items-center gap-2"><Database size={18} className="text-yellow-400"/> Asset Browser</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"><Upload size={16} /> Upload</button>
        </div>
      </div>
      {showUpload && (
        <div className="p-4 bg-gray-850 border-b border-gray-800">
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input ref={fileInputRef} type="file" multiple accept="image/*,audio/*,video/*,.json,.txt" onChange={handleFileUpload} className="hidden" id="asset-upload" />
            <label htmlFor="asset-upload" className="cursor-pointer flex flex-col items-center gap-2"><Upload size={32} className="text-gray-500" /><span className="text-gray-400 text-sm">Click to upload or drag files here</span><span className="text-gray-600 text-xs">Supports images, audio, video, JSON</span></label>
          </div>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-48 border-r border-gray-800 bg-gray-850 p-4 shrink-0 overflow-y-auto">
          <h3 className="text-gray-400 text-sm font-semibold mb-4 uppercase tracking-wider">Filter</h3>
          <div className="space-y-1">
            {[{ id: 'all', label: 'All Assets', icon: Database }, { id: 'image', label: 'Images', icon: ImageIcon }, { id: 'audio', label: 'Audio', icon: Volume2 }, { id: 'video', label: 'Video', icon: Film }, { id: 'font', label: 'Fonts', icon: Type }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}><tab.icon size={16} /> {tab.label}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500"><Database size={48} className="mb-4 opacity-20" /><p>No assets found. Upload some files to get started.</p></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAssets.map(asset => {
                const Icon = getIcon(asset.type);
                return (
                  <div key={asset.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors group" onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, items: getAssetMenuItems(asset) }); }}>
                    <div className="aspect-square bg-gray-900 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {asset.type === 'image' && asset.url ? <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" /> : <Icon size={32} className="text-gray-600" />}
                    </div>
                    <div className="flex items-center justify-between"><span className="text-sm text-gray-300 truncate flex-1" title={asset.name}>{asset.name}</span><Trash2 size={14} className="text-gray-600 hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => dispatch({ type: 'DELETE_ASSET', payload: asset.id })} /></div>
                    <span className="text-xs text-gray-500 uppercase">{asset.type}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}
    </div>
  );
};

// ==========================================
// --- PROJECT MANAGER SCREEN ---
// ==========================================

const ProjectManagerScreen = () => {
  const { state, dispatch } = useContext(EngineContext);
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.project, null, 2));
    const a = document.createElement('a'); a.href = dataStr; a.download = state.project.name + ".json"; document.body.appendChild(a); a.click(); a.remove();
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try { const project = JSON.parse(event.target.result); localStorage.setItem('nebula_engine_state_v4', JSON.stringify({ project, editor: INITIAL_EDITOR_STATE })); window.location.reload(); } 
      catch (err) { alert('Invalid project file'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 p-8 w-full items-center justify-center select-none">
       <div className="max-w-2xl w-full bg-gray-850 p-8 rounded-xl border border-gray-800 shadow-2xl">
          <div className="flex items-center gap-3 mb-8 justify-center"><div className="p-3 bg-blue-600 rounded-lg"><Code size={32} className="text-white" /></div><h1 className="text-3xl font-bold text-white">Nebula Engine</h1></div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'SCENE_EDITOR' })} className="flex flex-col items-center p-6 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl transition-all hover:scale-105"><FolderOpen size={40} className="text-blue-400 mb-3" /><span className="text-gray-200 font-semibold">Resume Project</span></button>
            <button onClick={() => dispatch({ type: 'RESET_STATE' })} className="flex flex-col items-center p-6 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl transition-all hover:scale-105"><Plus size={40} className="text-green-400 mb-3" /><span className="text-gray-200 font-semibold">New Project</span></button>
            <button onClick={handleExport} className="flex flex-col items-center p-6 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl transition-all hover:scale-105"><Download size={40} className="text-purple-400 mb-3" /><span className="text-gray-200 font-semibold">Export Project</span></button>
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center p-6 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl transition-all hover:scale-105"><input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" /><Upload size={40} className="text-yellow-400 mb-3" /><span className="text-gray-200 font-semibold">Import Project</span></button>
          </div>
       </div>
    </div>
  );
};

// ==========================================
// --- SETTINGS SCREEN ---
// ==========================================

const SettingsScreen = () => {
  const { state, dispatch } = useContext(EngineContext);
  const settings = state.project.settings;

  const updateSetting = (key, value) => { dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } }); };
  const updateViewport = (key, value) => { dispatch({ type: 'UPDATE_SETTINGS', payload: { viewport: { ...settings.viewport, [key]: value } } }); };
  const updateGrid = (key, value) => { dispatch({ type: 'UPDATE_SETTINGS', payload: { grid: { ...settings.grid, [key]: value } } }); };
  const updateGameFrame = (key, value) => { dispatch({ type: 'UPDATE_SETTINGS', payload: { gameFrame: { ...settings.gameFrame, [key]: value } } }); };

  return (
    <div className="flex flex-col h-full bg-gray-900 w-full select-none">
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-950">
        <div className="flex items-center gap-4"><button onClick={() => dispatch({ type: 'SET_SCREEN', payload: 'SCENE_EDITOR' })} className="text-gray-400 hover:text-white flex items-center gap-1 font-bold"><ChevronRight size={18} className="rotate-180" /> Back</button><h2 className="text-gray-200 font-bold flex items-center gap-2"><Settings2 size={18} className="text-blue-400"/> Settings Manager</h2></div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-gray-850 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2"><Monitor size={20} className="text-blue-400" /> Viewport Boundary Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <MobileInput label="Width" value={settings.viewport?.width || 1280} onChange={v => updateViewport('width', v)} type="number" />
              <MobileInput label="Height" value={settings.viewport?.height || 720} onChange={v => updateViewport('height', v)} type="number" />
            </div>
            <div className="mt-4"><ColorInput label="Background Color" value={settings.bgColor} onChange={v => updateSetting('bgColor', v)} /></div>
          </div>
          <div className="bg-gray-850 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2"><Grid3X3 size={20} className="text-green-400" /> Snap Grid Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <MobileInput label="Cell Width" value={settings.grid?.width || 100} onChange={v => updateGrid('width', v)} type="number" />
              <MobileInput label="Cell Height" value={settings.grid?.height || 100} onChange={v => updateGrid('height', v)} type="number" />
            </div>
            <div className="mt-3">
              <label className="flex items-center justify-between text-xs text-gray-400">
                <span>Enable Snapping on Move & Scale</span>
                <input type="checkbox" checked={settings.grid?.snap !== false} onChange={e => updateGrid('snap', e.target.checked)} className="accent-blue-500 w-4 h-4 rounded cursor-pointer" />
              </label>
            </div>
            <div className="mt-4"><MobileInput label="Opacity" value={settings.grid?.opacity || 0.05} onChange={v => updateGrid('opacity', v)} min={0} max={1} step={0.01} type="number" /></div>
            <div className="mt-4"><ColorInput label="Grid Color" value={settings.grid?.color || '#ffffff'} onChange={v => updateGrid('color', v)} /></div>
          </div>
          <div className="bg-gray-850 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2"><Maximize size={20} className="text-purple-400" /> Game Frame</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between text-xs text-gray-400">
                <span>Show Game Frame in Editor</span>
                <input type="checkbox" checked={settings.gameFrame?.showInEditor !== false} onChange={e => updateGameFrame('showInEditor', e.target.checked)} className="accent-blue-500 w-4 h-4 rounded cursor-pointer" />
              </label>
              <label className="flex items-center justify-between text-xs text-gray-400">
                <span>Enable Game Frame</span>
                <input type="checkbox" checked={settings.gameFrame?.enabled !== false} onChange={e => updateGameFrame('enabled', e.target.checked)} className="accent-blue-500 w-4 h-4 rounded cursor-pointer" />
              </label>
              <ColorInput label="Frame Color" value={settings.gameFrame?.color || '#3b82f6'} onChange={v => updateGameFrame('color', v)} />
              <MobileInput label="Overlay Opacity" value={settings.gameFrame?.opacity || 0.3} onChange={v => updateGameFrame('opacity', v)} min={0} max={1} step={0.05} type="number" />
            </div>
          </div>
          <div className="bg-gray-850 border border-gray-800 rounded-xl p-6"><h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2"><FileText size={20} className="text-purple-400" /> Project Info</h3><MobileInput label="Project Name" value={state.project.name} onChange={v => dispatch({ type: 'UPDATE_SETTINGS', payload: { name: v } })} type="text" /></div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// --- SCENE MANAGER ---
// ==========================================

const SceneManager = () => {
  const { state, dispatch } = useContext(EngineContext);
  const [showMenu, setShowMenu] = useState(false);
  const [editingScene, setEditingScene] = useState(null);
  const [editName, setEditName] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentScene = state.project.scenes.find(s => s.id === state.editor.activeSceneId);

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-1.5 text-gray-300 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors" title="Manage Scenes">
        <Monitor size={20} />
        <span className="text-sm font-medium max-w-[100px] truncate">{currentScene?.name}</span>
        <ChevronDown size={12} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>
      {showMenu && (
        <div 
          className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
          style={{ zIndex: 999999 }}
        >
          <div className="p-2 border-b border-gray-700">
            <button onClick={() => { dispatch({ type: 'ADD_SCENE', payload: { name: 'New Scene' } }); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded transition-colors">
              <Plus size={14} /> Add New Scene
            </button>
          </div>
          <div className="p-1 max-h-48 overflow-y-auto">
            {state.project.scenes.map(scene => (
              <div key={scene.id} className="flex items-center gap-1 group p-0.5">
                {editingScene === scene.id ? (
                  <input 
                    autoFocus 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    onBlur={() => { if (editName.trim()) dispatch({ type: 'RENAME_SCENE', payload: { id: scene.id, name: editName.trim() } }); setEditingScene(null); }} 
                    onKeyDown={e => { if (e.key === 'Enter') { if (editName.trim()) dispatch({ type: 'RENAME_SCENE', payload: { id: scene.id, name: editName.trim() } }); setEditingScene(null); } }} 
                    className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200" 
                  />
                ) : (
                  <button 
                    onClick={() => { dispatch({ type: 'SET_ACTIVE_SCENE', payload: scene.id }); setShowMenu(false); }} 
                    className={`flex-1 flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${scene.id === state.editor.activeSceneId ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                  >
                    <Monitor size={14} />
                    <span className="truncate">{scene.name}</span>
                  </button>
                )}
                {state.project.scenes.length > 1 && <button onClick={() => dispatch({ type: 'DELETE_SCENE', payload: scene.id })} className="p-1 text-gray-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={13} /></button>}
                <button onClick={() => { setEditingScene(scene.id); setEditName(scene.name); }} className="p-1 text-gray-500 hover:text-blue-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// --- FULLSCREEN PLAY MODE ---
// ==========================================

const FullscreenPlayMode = ({ onStop }) => {
  const { state } = useContext(EngineContext);
  const currentScene = state.project.scenes.find(s => s.id === state.editor.activeSceneId);
  const [stopBtnPos, setStopBtnPos] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const settings = state.project.settings;
  const vpW = settings.viewport?.width || 1280;
  const vpH = settings.viewport?.height || 720;

  const handlePointerDown = (e) => {
    setDragging(true);
    dragRef.current = { 
      startX: e.clientX || e.touches?.[0]?.clientX, 
      startY: e.clientY || e.touches?.[0]?.clientY, 
      initialX: stopBtnPos.x, 
      initialY: stopBtnPos.y 
    };
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    setStopBtnPos({ 
      x: Math.max(10, Math.min(window.innerWidth - 110, dragRef.current.initialX + dx)), 
      y: Math.max(10, Math.min(window.innerHeight - 60, dragRef.current.initialY + dy)) 
    });
  };

  const handlePointerUp = () => setDragging(false);
  const bgColor = state.project.settings.bgColor;

  // Calculate scale to fit game frame in window while maintaining aspect ratio
  const windowAspect = window.innerWidth / window.innerHeight;
  const gameAspect = vpW / vpH;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (windowAspect > gameAspect) {
    scale = window.innerHeight / vpH;
    offsetX = (window.innerWidth - vpW * scale) / 2;
  } else {
    scale = window.innerWidth / vpW;
    offsetY = (window.innerHeight - vpH * scale) / 2;
  }

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black select-none" 
      onMouseMove={handlePointerMove} 
      onMouseUp={handlePointerUp} 
      onTouchMove={handlePointerMove} 
      onTouchEnd={handlePointerUp}
    >
      <div 
        className="absolute"
        style={{ 
          left: offsetX,
          top: offsetY,
          width: vpW * scale,
          height: vpH * scale,
          backgroundColor: bgColor,
          overflow: 'hidden'
        }}
      >
        <div 
          className="absolute inset-0"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {currentScene?.objects.filter(o => !o.hidden && o.type !== 'Camera').map(obj => {
            const isText = obj.type === 'Text';
            const spriteUrl = obj.rendering?.sprite ? state.project.assets.find(a => a.id === obj.rendering.sprite)?.url : null;
            return (
              <div 
                key={obj.id} 
                className="absolute flex items-center justify-center"
                style={{ 
                  left: `${obj.transform.x}px`, 
                  top: `${obj.transform.y}px`, 
                  width: isText ? 'auto' : `${obj.transform.w}px`, 
                  height: isText ? 'auto' : `${obj.transform.h}px`, 
                  backgroundColor: isText ? 'transparent' : (spriteUrl ? 'transparent' : obj.rendering.color), 
                  opacity: obj.rendering.opacity, 
                  transform: `translate(-50%, -50%) rotate(${obj.transform.rotation}deg)`, 
                  fontSize: `${obj.rendering.fontSize || 24}px`, 
                  color: isText ? obj.rendering.color : undefined, 
                  textAlign: 'center', 
                  whiteSpace: 'nowrap',
                  backgroundImage: spriteUrl ? `url(${spriteUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {isText && <span style={{ color: obj.rendering.color, fontSize: `${obj.rendering.fontSize || 24}px` }}>{obj.rendering.text || obj.name}</span>}
                {obj.type === 'Audio' && <Music size={32} className="text-white opacity-50" />}
                {obj.type === 'Sprite' && !isText && !spriteUrl && <Box size={24} className="text-white opacity-30" />}
                {obj.type === 'Empty' && <Circle size={16} className="text-gray-500 opacity-50" />}
                {obj.type === 'Particle' && <Sparkles size={24} className="text-yellow-400 opacity-60 animate-pulse" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute z-10" style={{ left: stopBtnPos.x, top: stopBtnPos.y }} onMouseDown={handlePointerDown} onTouchStart={handlePointerDown}>
        <button onClick={onStop} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-full shadow-lg transition-colors cursor-pointer select-none"><Square size={16} fill="white" /> Stop</button>
      </div>
    </div>
  );
};

// ==========================================
// --- SCENE EDITOR LAYOUT (FIXED) ---
// ==========================================

const SceneEditorScreen = () => {
  const { state, dispatch } = useContext(EngineContext);
  const { currentTool, panels, isPlaying } = state.editor;
  const settings = state.project.settings;

  // Set initial camera to top-left of viewport
  useEffect(() => {
    const vpW = settings.viewport?.width || 1280;
    const vpH = settings.viewport?.height || 720;
    // Position camera so viewport top-left is at center of screen
    dispatch({ 
      type: 'UPDATE_CAMERA', 
      payload: { x: -vpW / 2 * 0.6, y: -vpH / 2 * 0.6, zoom: 0.6 } 
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let frameId;
    const loop = () => {
      if (state.editor.isPlaying) {
        const updatedScene = runPhysicsSimulation(
          state.project.scenes.find(s => s.id === state.editor.activeSceneId), 
          1/60
        );
        const scenesList = state.project.scenes.map(s => s.id === state.editor.activeSceneId ? updatedScene : s);

        const newProject = executeScripts({ ...state.project, scenes: scenesList });
        dispatch({ type: 'APPLY_SCRIPT_CHANGES', payload: { scenes: newProject.scenes } });
        dispatch({ type: 'UPDATE_PLAY_TIME', payload: state.editor.playTime + 1/60 });
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [state.editor.isPlaying, state.project, state.editor.activeSceneId, dispatch]);

  useEffect(() => { localStorage.setItem('nebula_engine_state_v4', JSON.stringify(state)); }, [state]);

  const recenterCamera = () => {
    const vpW = settings.viewport?.width || 1280;
    const vpH = settings.viewport?.height || 720;
    dispatch({ type: 'UPDATE_CAMERA', payload: { x: -vpW / 2 * 0.6, y: -vpH / 2 * 0.6, zoom: 0.6 } });
  };

  if (isPlaying) {
    return <FullscreenPlayMode onStop={() => dispatch({ type: 'TOGGLE_PLAY_MODE' })} />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 w-full overflow-hidden select-none">
      {/* FIXED TOOLBAR: Tools on LEFT, Actions on RIGHT */}
      <div className="h-14 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-3 shrink-0" style={{ zIndex: 100 }}>
        {/* LEFT: Project + Tools */}
        <div className="flex items-center gap-2">
          <IconButton icon={Menu} tooltip="Project" onClick={() => dispatch({type: 'SET_SCREEN', payload: 'PROJECT_MANAGER'})} />
          <div className="h-5 w-px bg-gray-700"></div>
          <SceneManager />
          <div className="h-5 w-px bg-gray-700 mx-1"></div>
          {/* Tools moved to LEFT */}
          <IconButton icon={MousePointer2} active={currentTool === 'select'} onClick={() => dispatch({type: 'SET_TOOL', payload: 'select'})} tooltip="Select" />
          <IconButton icon={Move} active={currentTool === 'move'} onClick={() => dispatch({type: 'SET_TOOL', payload: 'move'})} tooltip="Move" />
          <IconButton icon={Maximize} active={currentTool === 'scale'} onClick={() => dispatch({type: 'SET_TOOL', payload: 'scale'})} tooltip="Scale" />
          <IconButton icon={RotateCw} active={currentTool === 'rotate'} onClick={() => dispatch({type: 'SET_TOOL', payload: 'rotate'})} tooltip="Rotate" />
          <div className="h-5 w-px bg-gray-700 mx-1"></div>
          <IconButton icon={Crosshair} tooltip="Recenter" onClick={recenterCamera} />
        </div>

        {/* RIGHT: Actions + Panels */}
        <div className="flex items-center gap-2">
           <IconButton icon={Undo} tooltip="Undo" onClick={() => dispatch({type: 'UNDO'})} disabled={state.editor.historyPointer <= 0} />
           <IconButton icon={Redo} tooltip="Redo" onClick={() => dispatch({type: 'REDO'})} disabled={state.editor.historyPointer >= state.editor.history.length - 1} />
           <div className="h-5 w-px bg-gray-700 mx-1"></div>
           <button onClick={() => dispatch({type: 'TOGGLE_PLAY_MODE'})} className="flex items-center gap-1.5 bg-green-600/20 text-green-400 px-3 py-1.5 rounded-full hover:bg-green-600/30 transition-colors border border-green-600/30">
             <PlayCircle size={16} /> <span className="font-semibold text-sm">Play</span>
           </button>
           <div className="h-5 w-px bg-gray-700 mx-1"></div>
           <IconButton icon={FileIcon} tooltip="Assets" onClick={() => dispatch({type: 'SET_SCREEN', payload: 'ASSETS'})} />
           <IconButton icon={Settings2} tooltip="Settings" onClick={() => dispatch({type: 'SET_SCREEN', payload: 'SETTINGS'})} />
           <div className="h-5 w-px bg-gray-700 mx-1"></div>
           <IconButton icon={Layers} active={panels.hierarchy} onClick={() => dispatch({type: 'TOGGLE_PANEL', payload: 'hierarchy'})} tooltip="Hierarchy" />
           <IconButton icon={Sliders} active={panels.properties} onClick={() => dispatch({type: 'TOGGLE_PANEL', payload: 'properties'})} tooltip="Inspector" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden relative">
        <div className={`transition-all duration-300 ease-in-out h-full ${panels.hierarchy ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}><HierarchyPanel /></div>
        <SceneViewport />
        <div className={`transition-all duration-300 ease-in-out h-full ${panels.properties ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}><PropertiesPanel /></div>
      </div>
    </div>
  );
};

// ==========================================
// --- APP ROOT ---
// ==========================================

export default function App() {
  const [state, dispatch] = useReducer(engineReducer, null, loadSavedState);

  const renderScreen = () => {
    switch (state.editor.activeScreen) {
      case 'SCENE_EDITOR': return <SceneEditorScreen />;
      case 'SCRIPT_EDITOR': return <VisualScriptingScreen />;
      case 'ASSETS': return <AssetsScreen />;
      case 'SETTINGS': return <SettingsScreen />;
      case 'PROJECT_MANAGER': return <ProjectManagerScreen />;
      default: return <ProjectManagerScreen />;
    }
  };

  return (
    <EngineContext.Provider value={{ state, dispatch }}>
      <div className="h-screen w-screen bg-black overflow-hidden flex font-sans text-gray-200">
         {renderScreen()}
      </div>
    </EngineContext.Provider>
  );
}
