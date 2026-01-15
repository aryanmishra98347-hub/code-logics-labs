const axios = require('axios');

// ============================================
// ENHANCED AI CODE CONTROLLER - CONVERSATIONAL
// Multi-API Integration with Claude-like responses
// ============================================

exports.generateCode = async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validation
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Please provide a valid prompt' 
      });
    }

    const cleanPrompt = prompt.trim();
    console.log('📝 Received:', cleanPrompt.substring(0, 80) + '...');

    // Check if development-related
    if (!isDevelopmentRelated(cleanPrompt)) {
      return res.json({
        success: true,
        code: generateNonDevResponse()
      });
    }

    // Try APIs in sequence with timeout
    let response = null;

    // 1. Try Groq (Fast & Free tier friendly)
    response = await tryGroqAPI(cleanPrompt);
    if (response) {
      console.log('✅ Groq API success');
      return res.json({ success: true, code: response, source: 'groq' });
    }

    // 2. Try Hugging Face
    response = await tryHuggingFaceAPI(cleanPrompt);
    if (response) {
      console.log('✅ Hugging Face success');
      return res.json({ success: true, code: response, source: 'huggingface' });
    }

    // 3. Try OpenAI (if available)
    response = await tryOpenAIAPI(cleanPrompt);
    if (response) {
      console.log('✅ OpenAI success');
      return res.json({ success: true, code: response, source: 'openai' });
    }

    // 4. Fallback to intelligent local responses
    console.log('⚡ Using intelligent fallback');
    const fallbackResponse = generateIntelligentResponse(cleanPrompt);
    return res.json({ 
      success: true, 
      code: fallbackResponse,
      source: 'fallback'
    });

  } catch (error) {
    // Never crash - always return helpful response
    console.error('❌ Error:', error.message);
    
    try {
      const safeResponse = generateIntelligentResponse(req.body?.prompt || 'help with coding');
      return res.json({ 
        success: true, 
        code: safeResponse,
        source: 'emergency_fallback'
      });
    } catch (finalError) {
      // Ultimate failsafe
      return res.json({
        success: true,
        code: getUltimateFallback(),
        source: 'ultimate_fallback'
      });
    }
  }
};

// ============================================
// API FUNCTIONS WITH IMPROVED SYSTEM PROMPTS
// ============================================

async function tryGroqAPI(prompt) {
  try {
    const API_KEY = process.env.GROQ_API_KEY;
    if (!API_KEY) {
      console.log('⚠️ GROQ_API_KEY not configured');
      return null;
    }

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a friendly, expert programming tutor with a conversational style. Your goal is to help developers understand and solve problems effectively.

## Response Style:
- Write in a natural, conversational tone like you're chatting with a colleague
- Start with a brief acknowledgment or context
- Explain concepts clearly without being overly formal
- Use analogies and real-world examples when helpful
- Be encouraging and supportive

## Response Structure:
1. **Brief intro** - Acknowledge their question and provide context (1-2 sentences)
2. **Main explanation** - Explain the concept or approach clearly
3. **Code example** - Provide clean, well-commented code with markdown formatting
4. **Key points** - Highlight important takeaways or common pitfalls
5. **Optional next steps** - Suggest what they might want to explore next

## Code Format:
- Always use proper markdown code blocks with language specification
- Add helpful inline comments
- Include usage examples
- Show expected output when relevant

## Tone Guidelines:
- Friendly but professional
- Encouraging without being condescending
- Clear and concise, avoiding unnecessary jargon
- Use occasional emojis sparingly (✅, 💡, 🚀) but don't overdo it

Remember: You're having a helpful conversation, not writing a textbook.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    return content || null;
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.log('⚠️ Groq failed:', errorMsg);
    return null;
  }
}

async function tryHuggingFaceAPI(prompt) {
  try {
    const API_KEY = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
    if (!API_KEY) {
      console.log('⚠️ HF_API_KEY not configured');
      return null;
    }

    const response = await axios.post(
      'https://api-inference.huggingface.co/models/codellama/CodeLlama-34b-Instruct-hf',
      {
        inputs: `<s>[INST] You are a friendly programming tutor having a helpful conversation with a developer.

Style Guide:
- Be conversational and natural, not robotic
- Start with a brief acknowledgment of their question
- Explain clearly with context and examples
- Use markdown code blocks with proper syntax highlighting
- Add helpful comments in code
- End with key takeaways or next steps
- Be encouraging and supportive

User question: ${prompt}

Respond in a friendly, conversational way with clear code examples. [/INST]`,
        parameters: {
          max_new_tokens: 1500,
          temperature: 0.7,
          return_full_text: false
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 25000
      }
    );

    // Handle different response formats
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data[0]?.generated_text || null;
    }
    return response.data?.generated_text || null;
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    console.log('⚠️ HF failed:', errorMsg);
    return null;
  }
}

async function tryOpenAIAPI(prompt) {
  try {
    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) {
      console.log('⚠️ OPENAI_API_KEY not configured');
      return null;
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a friendly, expert programming tutor. Respond conversationally like you're helping a colleague.

Guidelines:
- Start with a brief, natural acknowledgment
- Explain concepts clearly with context
- Provide well-commented code in markdown blocks
- Include practical examples
- End with key points or next steps
- Be encouraging and supportive
- Use a natural, conversational tone`
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    return content || null;
  } catch (error) {
    console.log('⚠️ OpenAI failed:', error.message);
    return null;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function isDevelopmentRelated(prompt) {
  const lower = prompt.toLowerCase();
  
  const devKeywords = [
    // General programming
    'code', 'function', 'class', 'method', 'algorithm', 'debug', 'error', 'bug',
    'programming', 'develop', 'build', 'create', 'implement', 'syntax', 'compile',
    
    // Languages
    'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
    'typescript', 'swift', 'kotlin', 'scala', 'html', 'css', 'sql',
    
    // Frameworks & Libraries
    'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring',
    'laravel', 'rails', 'nextjs', 'nuxt', 'svelte', 'jquery',
    
    // Concepts
    'api', 'rest', 'graphql', 'database', 'mongodb', 'array', 'object',
    'loop', 'variable', 'async', 'await', 'promise', 'callback', 'recursion',
    'component', 'state', 'props',
    
    // Data structures
    'tree', 'graph', 'linked list', 'stack', 'queue', 'hash', 'sorting',
    'search', 'binary', 'heap',
    
    // Tools & Practices
    'git', 'docker', 'test', 'deploy', 'npm', 'yarn', 'webpack', 'optimization',
    'refactor', 'package', 'module', 'import', 'export'
  ];
  
  return devKeywords.some(keyword => lower.includes(keyword));
}

function generateNonDevResponse() {
  return `I appreciate you reaching out! However, I'm specifically designed to help with programming and software development questions.

I'd be happy to help you with things like:

- **Writing code** - Functions, classes, algorithms, complete applications
- **Debugging** - Finding and fixing errors in your code
- **Learning** - Programming concepts, best practices, design patterns
- **Building projects** - Web apps, APIs, tools, and more
- **Code reviews** - Improving structure, performance, and readability

For example, I can help with questions like:
- "How do I create a REST API with authentication?"
- "Can you help debug this React component?"
- "What's the best way to implement a binary search tree?"
- "Build me a todo app with a database"

Feel free to ask any programming-related question, and I'll be glad to help! 🚀`;
}

function getUltimateFallback() {
  return `Hey there! I'm here to help you with coding and development.

I can assist with:

- **Writing code** - From simple functions to complete applications
- **Debugging** - Track down and fix those pesky bugs
- **Learning** - Understand programming concepts step-by-step
- **Building projects** - Create web apps, APIs, tools, and more
- **Code optimization** - Make your code faster and cleaner

Just ask me about any programming topic, and let's build something great together!

What would you like to work on today?`;
}

function generateIntelligentResponse(prompt) {
  const lower = prompt.toLowerCase();
  
  // Binary Search Tree
  if (lower.includes('binary search tree') || lower.includes('bst')) {
    return `A Binary Search Tree is a great data structure for maintaining sorted data with efficient operations. Let me show you how to build one from scratch.

## What's a BST?

A BST is a tree where each node follows these rules:
- All values in the left subtree are smaller
- All values in the right subtree are larger
- Each subtree is also a valid BST

This structure gives us O(log n) average-case performance for search, insert, and delete operations.

Here's a complete implementation:

\`\`\`javascript
class Node {
    constructor(value) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

class BinarySearchTree {
    constructor() {
        this.root = null;
    }
    
    // Insert a value into the tree
    insert(value) {
        const newNode = new Node(value);
        
        // If tree is empty, new node becomes root
        if (this.root === null) {
            this.root = newNode;
            return this;
        }
        
        // Find the correct position
        let current = this.root;
        while (true) {
            // Duplicate values - just return
            if (value === current.value) return undefined;
            
            if (value < current.value) {
                // Go left
                if (current.left === null) {
                    current.left = newNode;
                    return this;
                }
                current = current.left;
            } else {
                // Go right
                if (current.right === null) {
                    current.right = newNode;
                    return this;
                }
                current = current.right;
            }
        }
    }
    
    // Search for a value
    search(value) {
        let current = this.root;
        
        while (current) {
            if (value === current.value) return true;
            
            // Go left or right based on value
            current = value < current.value 
                ? current.left 
                : current.right;
        }
        
        return false;
    }
    
    // Get sorted values (inorder traversal)
    inorder(node = this.root, result = []) {
        if (node) {
            this.inorder(node.left, result);
            result.push(node.value);
            this.inorder(node.right, result);
        }
        return result;
    }
    
    // Find minimum value
    findMin(node = this.root) {
        while (node.left) {
            node = node.left;
        }
        return node.value;
    }
    
    // Find maximum value
    findMax(node = this.root) {
        while (node.right) {
            node = node.right;
        }
        return node.value;
    }
}

// Usage example
const bst = new BinarySearchTree();

// Build the tree
bst.insert(50);
bst.insert(30);
bst.insert(70);
bst.insert(20);
bst.insert(40);
bst.insert(60);
bst.insert(80);

// Search for values
console.log(bst.search(40));  // true
console.log(bst.search(25));  // false

// Get sorted values
console.log(bst.inorder());   // [20, 30, 40, 50, 60, 70, 80]

// Find min and max
console.log(bst.findMin());   // 20
console.log(bst.findMax());   // 80
\`\`\`

## Complexity Analysis

- **Insert**: O(log n) average, O(n) worst case
- **Search**: O(log n) average, O(n) worst case  
- **Space**: O(n) for storing nodes

The worst case happens when the tree becomes unbalanced (like a linked list). To prevent this, you'd use self-balancing trees like AVL or Red-Black trees.

**Key advantages:**
✅ Fast search and insertion for most cases
✅ Maintains sorted order automatically
✅ Easy to traverse in sorted order

Want me to show you how to implement deletion or tree balancing?`;
  }
  
  // Quicksort
  if (lower.includes('quicksort') || lower.includes('quick sort')) {
    return `QuickSort is one of the most efficient sorting algorithms, and it's actually quite elegant once you understand the core idea. Let me walk you through it.

## The Core Idea

QuickSort uses a "divide and conquer" strategy:
1. Pick a pivot element
2. Partition the array so smaller elements go left, larger go right
3. Recursively sort both sides

Here are two implementations - a simple one and an optimized in-place version:

\`\`\`javascript
// Simple, easy-to-understand version
function quickSort(arr) {
    // Base case: arrays with 0 or 1 element are already sorted
    if (arr.length <= 1) {
        return arr;
    }
    
    // Choose middle element as pivot (could be any element)
    const pivot = arr[Math.floor(arr.length / 2)];
    
    // Partition: separate into three groups
    const left = arr.filter(x => x < pivot);
    const middle = arr.filter(x => x === pivot);  // Handle duplicates
    const right = arr.filter(x => x > pivot);
    
    // Recursively sort and combine
    return [...quickSort(left), ...middle, ...quickSort(right)];
}

// In-place version (more efficient, less memory)
function quickSortInPlace(arr, low = 0, high = arr.length - 1) {
    if (low < high) {
        // Partition and get pivot position
        const pivotIndex = partition(arr, low, high);
        
        // Recursively sort left and right sides
        quickSortInPlace(arr, low, pivotIndex - 1);
        quickSortInPlace(arr, pivotIndex + 1, high);
    }
    return arr;
}

function partition(arr, low, high) {
    const pivot = arr[high];  // Use last element as pivot
    let i = low - 1;  // Index for smaller element
    
    for (let j = low; j < high; j++) {
        // If current element is smaller than pivot
        if (arr[j] < pivot) {
            i++;
            // Swap elements
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
    
    // Place pivot in correct position
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    return i + 1;
}

// Test both versions
const numbers = [64, 34, 25, 12, 22, 11, 90, 88];

console.log('Simple version:');
console.log(quickSort([...numbers]));
// Output: [11, 12, 22, 25, 34, 64, 88, 90]

console.log('In-place version:');
console.log(quickSortInPlace([...numbers]));
// Output: [11, 12, 22, 25, 34, 64, 88, 90]
\`\`\`

## Performance Characteristics

- **Average case**: O(n log n) - Very fast!
- **Best case**: O(n log n)
- **Worst case**: O(n²) - When array is already sorted and we pick bad pivots
- **Space**: O(log n) for the call stack

## Pro Tips

💡 **Avoid worst case**: Choose a random pivot or use "median of three" strategy

💡 **For small arrays**: Switch to insertion sort (faster for < 10 elements)

💡 **Stability**: QuickSort is not stable (doesn't preserve order of equal elements)

The in-place version is what you'd typically use in production because it uses less memory. The simple version is easier to understand and good for learning.

Want to see how to optimize it further or implement the randomized version?`;
  }
  
  // React Component
  if (lower.includes('react') && (lower.includes('component') || lower.includes('hook') || lower.includes('usestate') || lower.includes('useeffect'))) {
    return `Let me show you how to build a practical React component using modern hooks. This example covers the most common patterns you'll use in real applications.

## Todo App Component

This component demonstrates state management, side effects, form handling, and list rendering - all the essentials:

\`\`\`javascript
import { useState, useEffect } from 'react';

function TodoApp() {
    // State management
    const [todos, setTodos] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'
    
    // Load todos when component mounts
    useEffect(() => {
        loadTodos();
    }, []); // Empty array = run once on mount
    
    // Save to localStorage whenever todos change
    useEffect(() => {
        localStorage.setItem('todos', JSON.stringify(todos));
    }, [todos]); // Run when todos changes
    
    const loadTodos = async () => {
        setLoading(true);
        try {
            // Try loading from API first
            const res = await fetch('/api/todos');
            const data = await res.json();
            setTodos(data);
        } catch (error) {
            // Fallback to localStorage
            const saved = localStorage.getItem('todos');
            if (saved) {
                setTodos(JSON.parse(saved));
            }
        } finally {
            setLoading(false);
        }
    };
    
    const addTodo = (e) => {
        e.preventDefault();
        
        // Validation
        if (!input.trim()) return;
        
        // Add new todo
        const newTodo = {
            id: Date.now(),
            text: input.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        setTodos([...todos, newTodo]);
        setInput(''); // Clear input
    };
    
    const toggleTodo = (id) => {
        setTodos(todos.map(todo =>
            todo.id === id 
                ? { ...todo, completed: !todo.completed }
                : todo
        ));
    };
    
    const deleteTodo = (id) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };
    
    // Filter todos based on current filter
    const filteredTodos = todos.filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true; // 'all'
    });
    
    // Show loading state
    if (loading) {
        return <div className="loading">Loading your todos...</div>;
    }
    
    return (
        <div className="todo-app">
            <h1>My Todo List</h1>
            
            {/* Add todo form */}
            <form onSubmit={addTodo} className="todo-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="What needs to be done?"
                    className="todo-input"
                />
                <button type="submit" disabled={!input.trim()}>
                    Add Todo
                </button>
            </form>
            
            {/* Filter buttons */}
            <div className="filters">
                <button 
                    onClick={() => setFilter('all')}
                    className={filter === 'all' ? 'active' : ''}
                >
                    All ({todos.length})
                </button>
                <button 
                    onClick={() => setFilter('active')}
                    className={filter === 'active' ? 'active' : ''}
                >
                    Active ({todos.filter(t => !t.completed).length})
                </button>
                <button 
                    onClick={() => setFilter('completed')}
                    className={filter === 'completed' ? 'active' : ''}
                >
                    Completed ({todos.filter(t => t.completed).length})
                </button>
            </div>
            
            {/* Todo list */}
            <ul className="todo-list">
                {filteredTodos.length === 0 ? (
                    <li className="empty">No todos to show</li>
                ) : (
                    filteredTodos.map(todo => (
                        <li key={todo.id} className="todo-item">
                            <input
                                type="checkbox"
                                checked={todo.completed}
                                onChange={() => toggleTodo(todo.id)}
                                className="todo-checkbox"
                            />
                            <span className={todo.completed ? 'completed' : ''}>
                                {todo.text}
                            </span>
                            <button 
                                onClick={() => deleteTodo(todo.id)}
                                className="delete-btn"
                            >
                                ×
                            </button>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}

export default TodoApp;
\`\`\`

## Key React Hooks Explained

**useState** - Manages component state:
\`\`\`javascript
const [value, setValue] = useState(initialValue);
\`\`\`

**useEffect** - Handles side effects (API calls, subscriptions, etc.):
\`\`\`javascript
useEffect(() => {
    // Run this code
    return () => {
        // Cleanup function (optional)
    };
}, [dependencies]); // Only re-run when these change
\`\`\`

## Important Patterns

✅ **Always validate input** before adding to state
✅ **Use functional updates** when new state depends on old: \`setState(prev => prev + 1)\`
✅ **Handle loading states** for better UX
✅ **Clean up effects** to prevent memory leaks
✅ **Use keys properly** in lists (use unique IDs, not array indexes)

This pattern works for most CRUD operations. You can adapt it for user profiles, shopping carts, or any list-based UI!

Need help with more advanced patterns like custom hooks or context?`;
  }
  
  // REST API
  if ((lower.includes('rest') || lower.includes('api')) && (lower.includes('node') || lower.includes('express'))) {
    return `Let me show you how to build a professional REST API with Express. This covers all the CRUD operations with proper error handling and validation.

## Complete REST API Example

\`\`\`javascript
const express = require('express');
const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Sample data (in real app, this would be a database)
let users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' }
];

// GET all users with pagination and filtering
app.get('/api/users', (req, res) => {
    const { page = 1, limit = 10, role } = req.query;
    
    let filteredUsers = users;
    
    // Filter by role if provided
    if (role) {
        filteredUsers = users.filter(u => u.role === role);
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    res.json({ 
        success: true,
        data: paginatedUsers,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredUsers.length
        }
    });
});

// GET single user by ID
app.get('/api/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    
    if (!user) {
        return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
        });
    }
    
    res.json({ 
        success: true, 
        data: user 
    });
});

// POST create new user
app.post('/api/users', (req, res) => {
    const { name, email, role = 'user' } = req.body;
    
    // Validation
    if (!name || !email) {
        return res.status(400).json({ 
            success: false, 
            message: 'Name and email are required' 
        });
    }
    
    // Check if email already exists
    if (users.find(u => u.email === email)) {
        return res.status(409).json({
            success: false,
            message: 'Email already exists'
        });
    }
    
    // Create new user
    const newUser = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    res.status(201).json({ 
        success: true, 
        data: newUser,
        message: 'User created successfully'
    });
});

// PUT update existing user (full update)
app.put('/api/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    
    if (!user) {
        return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
        });
    }
    
    const { name, email, role } = req.body;
    
    // Validation
    if (!name || !email) {
        return res.status(400).json({
            success: false,
            message: 'Name and email are required'
        });
    }
    
    // Update user
    user.name = name.trim();
    user.email = email.toLowerCase().trim();
    user.role = role || user.role;
    user.updatedAt = new Date().toISOString();
    
    res.json({ 
        success: true, 
        data: user,
        message: 'User updated successfully'
    });
});

// PATCH partial update
app.patch('/api/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    
    if (!user) {
        return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
        });
    }
    
    // Update only provided fields
    const { name, email, role } = req.body;
    
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (role) user.role = role;
    user.updatedAt = new Date().toISOString();
    
    res.json({ 
        success: true, 
        data: user,
        message: 'User updated successfully'
    });
});

// DELETE user
app.delete('/api/users/:id', (req, res) => {
    const index = users.findIndex(u => u.id === parseInt(req.params.id));
    
    if (index === -1) {
        return res.status(404).json({ 
            success: false, 
            message: 'User not found' 
        });
    }
    
    // Remove user
    const deletedUser = users.splice(index, 1)[0];
    
    res.json({ 
        success: true, 
        data: deletedUser,
        message: 'User deleted successfully' 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        message: 'Route not found' 
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(\`🚀 Server running on http://localhost:\${PORT}\`);
});
\`\`\`

## HTTP Methods & Status Codes

**Methods:**
- **GET** - Retrieve data (200 OK)
- **POST** - Create new resource (201 Created)
- **PUT** - Full update (200 OK)
- **PATCH** - Partial update (200 OK)
- **DELETE** - Remove resource (200 OK)

**Common Status Codes:**
- 200 OK - Success
- 201 Created - Resource created
- 400 Bad Request - Invalid input
- 404 Not Found - Resource doesn't exist
- 409 Conflict - Duplicate resource
- 500 Server Error - Something went wrong

## Best Practices

✅ Always validate input data
✅ Use proper HTTP status codes
✅ Implement error handling
✅ Return consistent response format
✅ Add pagination for list endpoints
✅ Sanitize user input
✅ Use environment variables for config

You can test this API using Postman or curl:
\`\`\`bash
# Get all users
curl http://localhost:3000/api/users

# Create user
curl -X POST http://localhost:3000/api/users \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Bob","email":"bob@example.com"}'
\`\`\`

Want to add authentication, database integration, or rate limiting?`;
  }
  
  // Default response
  return `Hey there! I'm here to help you with coding and development. What would you like to build today?

I can assist with:

**Learning & Understanding**
- Programming concepts and fundamentals
- Data structures and algorithms
- Design patterns and best practices
- Language-specific features

**Building Projects**
- Web applications (React, Vue, Angular)
- Backend APIs (Node.js, Express, Python)
- Full-stack applications
- Command-line tools

**Debugging & Optimization**
- Finding and fixing bugs
- Performance optimization
- Code refactoring
- Architecture improvements

**Common Topics I Help With:**
- JavaScript/TypeScript, Python, Java, C++
- React, Node.js, Express
- Algorithms (sorting, searching, trees, graphs)
- REST APIs and databases
- Git and development workflows

## Try asking me:

💡 "Build a REST API with user authentication"
💡 "Explain how React hooks work with examples"
💡 "Implement a binary search tree"
💡 "Help me debug this async function"
💡 "Create a responsive navbar component"

What would you like to work on? I'm here to help!`;
}