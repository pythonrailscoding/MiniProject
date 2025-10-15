import datetime
import os

from bson import ObjectId
from pymongo import MongoClient
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

# This checks normal "strength" of password
from password_strength import PasswordPolicy

# Hash your password, never store it directly
from passlib.context import CryptContext

# Need for CORS, idea for a React frontend , I will need it
# CORS allows different servers to interact, recall django
# CORS => Cross Origin Resource Sharing

load_dotenv()
app = Flask(__name__)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
# Your essentially max. login time
# Once this expires, you are logged out
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=24)
jwt = JWTManager(app)

# MongoDB connection
client = MongoClient(os.environ.get("MONGO_URI"))
db = client['MainDatabase']

# Test this connection
"""
The ping command is a simple test to check if your MongoDB connection is working.
This sends a basic "are you there?" message to the MongoDB server. If the server responds, your connection is good. If it fails, you'll get an exception.
Think of it like:

1> Knocking on a door to see if someone answers
2>A health check to verify the database is reachable and responsive
"""
try:
    client.admin.command('ping')
    print("\033[32mMongoDB connected successfully\033[0m")
except Exception as e:
    print("\033[31mMongoDB connection failed, ", e, "\033[0m")

try:
    # Create indexes
    """
    Refer to indexes on info/indexes.txt
    """
    db.users.create_index('username', unique=True)
    db.tasks.create_index('user_id')
    db.tasks.create_index([('user_id', 1), ('created_at', -1)])
    print("\033[32mIndexes created successfully\033[0m")
except Exception as e:
    print(f"\033[31mIndex creation: {e}\033[0m")

# Authentication routes
# Password strength policy
policy = PasswordPolicy.from_names(
    length=8,       # minimum length
    uppercase=1,    # at least 1 uppercase letter
    numbers=1,      # at least 1 number
    special=1       # at least 1 special character
)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Define serializers

"""
A serializer converts complex data types into a format that can be easily rendered into 
JSON, XML, or other content types, and also allows for the reverse process of deserialization.
"""

def serialize_user(user):
    """
    Input: MongoDB document (user), which contains ObjectId (not JSON-serializable) and a password.

    Output: Python dict with only JSON-safe fields.
    :param user:
    :return: a python dict which could be jsonified
    """
    if user:
        # Create a copy, though unlikely to mutate, it may mutate, a good practise to do this approach
        safe_user = user.copy()
        safe_user['_id'] = str(safe_user['_id'])
        safe_user.pop('password', None)
        return safe_user
    return user

def serialize_todo(todo):
    if todo:
        safe_todo = todo.copy()
        safe_todo['_id'] = str(safe_todo['_id'])
        safe_todo['user_id'] = str(safe_todo['user_id'])
        return safe_todo
    return todo


# noinspection DuplicatedCode
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()

    username = "@"+data['username']
    password = data['password']
    username = username.strip().lower()

    if not username or not password:
        return jsonify({'message': 'Please provide username and password.'}), 400

    # Check if user already exists
    if db.users.find_one({'username': username}):
        return jsonify({'error': 'User already registered, choose a new username'}), 400

    # Check password strength
    rules_failed = policy.test(password)
    if rules_failed:
        rules_failed_list = [str(rules_failed) for rules_failed in rules_failed]
        return jsonify({'error': "Weak Password", "details": rules_failed_list}), 400

    # Always Hash your password
    # Django too hashes and stores password
    hashed_password = pwd_context.hash(password)

    # Create user
    user = {
        'username': username,
        'password': hashed_password,
        "created_at": datetime.datetime.utcnow(),
    }

    result = db.users.insert_one(user)

    # Create access tokens, No refresh token system as in simple-jwt of React
    access_token = create_access_token(identity=str(result.inserted_id))

    return jsonify({
        'message': 'User registered successfully',
        'access_token': access_token,
        'user': {
            'id': str(result.inserted_id),
            'name': username
        }
    }), 201


# noinspection DuplicatedCode
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = "@"+data['username']
    password = data['password']
    username = username.strip().lower()

    if not username or not password:
        return jsonify({'message': 'Please provide username and password.'}), 400

    # Find that user
    user = db.users.find_one({'username': username})

    if not user:
        return jsonify({'message': 'User does not exist'}), 404

    if not pwd_context.verify(password, user['password']):
        return jsonify({'message': 'Incorrect password'}), 401

    # Create access token
    access_token = create_access_token(identity=str(user['_id']))
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': {
            'id': str(user['_id']),
            # Find username, if exists, return that else return an empty string
            'name': user.get('username', '')
        }
    })



# Logout, by logout, you simply remove access token in frontend. All API's basically use require jwt's access token
# You store that in localstorage, even in React.js, This is similar to simple-jwt in React+Django stuff
# Here, Logout/Login APIs are created, no drama of refresh token as in Django REST framework, usage of simple jwt is good in react
@app.route('/api/auth/logout', methods=['POST'])
@jwt_required
def logout():
    # What you will do here? Just built it for the sake of it, remove access token from localstorage (or sessionstorage, why not? ;))
    return jsonify({'message': 'Logout successful'}), 200

# Get current user details
# Slap this in profile page of the user
@app.route('/api/auth/me', methods=['GET'])
@jwt_required
# This returns id of current user, so that when you send requests to create a task, id will be called from here
def get_current_user():
    """
    Recall, when you place a call, you send access token via Authorization header.
    you send Bearer a token.

    In register,
    access_token = create_access_token(identity=str(result.inserted_id))
    you get an identity parameter.
    your current user will be sorted out on this basis
    """
    current_user = get_jwt_identity()
    user = db.users.find_one({'_id': ObjectId(current_user)})

    if not user:
        return jsonify({'message': 'User does not exist'}), 404
    return jsonify({serialize_user(user)})







# Task App URLs

@app.route('/api/todos', methods=['GET'])
@jwt_required()
def get_tasks():
    current_user = get_jwt_identity()

    todo_list = list(db.tasks.find({'user_id': ObjectId(current_user)}))
    """
    This find() returns a Pythmango Cursor object
    <pymongo.cursor.Cursor object at 0x7f8a2b1c2d30>
    You could iterate over it, 
    for item in cursor:
        print(item)
        
    Sample output:
    {'_id': ObjectId('6521a1e1f1c1a1b1c1d1e1f1'), 'title': 'Buy milk', 'completed': False, 'user_id': ObjectId('6521a1f2f2c2b2c2d2e2f2f2')}
    {'_id': ObjectId('6521a1e3f1c1a1b1c1d1e3f3'), 'title': 'Read book', 'completed': False, 'user_id': ObjectId('6521a1f3f3c3b3c3d3e3f3f3')}

    
    You type cast it into a list to get your task lists as a python array, remember, you did this many times
    """
    """
    Obviously, you will sort this list in [-id]
    Recall django, 
    class Meta:
        ordering = ['-id']
    This gives newest item first, our desired result
    """
    # This will first iterate over iterable (list) and return created_at for each item. Then sort algorithm sorts 'reversely' on basis
    # of time
    todo_list.sort(key=lambda todo:todo['created_at'], reverse=True)

    # return serialized data
    # todo_list is a list, why serialize it? Your _id and user_id are not string objects, it should be just a string object, not ObjectID
    # Else, expect this "TypeError: Object of type ObjectId is not JSON serializable"
    return jsonify([serialize_todo(todo) for todo in todo_list])

@app.route('/api/todos', methods=['POST'])
@jwt_required()
def create_task():
    # Get the json data as REQUEST, send via POSTMAN
    # get_json() => json data into python dict
    data = request.get_json()
    current_user = get_jwt_identity()

    task = {
        'user_id': ObjectId(current_user),
        'title': data['title'],
        'completed': False,
        'description': data['description'],
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow(),
    }

    result = db.tasks.insert_one(task)
    """
    print(result)                  # <pymongo.results.InsertOneResult object at 0x...>
    print(result.inserted_id)      # ObjectId('6521a1e1f1c1a1b1c1d1e1f1')
    print(result.acknowledged)     # True
    
    Hence, don't serialize this result, serialize task. What to serialize there? ObjectID
    """
    task['_id'] = str(result.inserted_id)

    return jsonify(serialize_todo(task)), 201

"""
Move /api/todos/get_stats before /api/todos/<task_id> or Flask will treat "get_stats" as a task_id
Why?
This is a classic Flask route ordering issue, and it happens because of how Flask matches URLs.


How Flask matches routes?
1) Flask checks your routes top to bottom in the order they are defined.
2) When a request comes in, Flask looks for the first route that matches the URL pattern.
3) Once it finds a match, it stops checking further routes.

If a user calls /api/todos/get_stats and /api/todos/<task_id> is defined first, Flask will try to match <task_id> with "get_stats".
It thinks "get_stats" is a task_id string instead of recognizing it as the stats route.
Result: the wrong function runs, or we might get a 404/error.

Always define the more specific routes first, and the generic ones later


Key takeaway
Flask route order matters!
Specific routes first, generic (variable) routes later.
Otherwise, Flask’s pattern matching may capture URLs you didn’t intend.
"""

# AI gave me a cool feature, print out stats, i.e., no. of tasks, no. of them completed and no. not completed
# You can get length by len(list(Cursor object))
# OR, use count_documents()
@app.route('/api/todos/get_stats', methods=['GET'])
@jwt_required()
def get_todos_stats():
    current_user_id = get_jwt_identity()

    total = db.tasks.count_documents({'user_id': ObjectId(current_user_id)})

    completed_total = db.tasks.count_documents({'user_id': ObjectId(current_user_id), "completed": True})

    result = {
        'total': total,
        'completed': completed_total,
        'pending': total - completed_total,
    }

    return jsonify(result)

# READ - Get single task
@app.route('/api/todos/<task_id>', methods=['GET'])
@jwt_required()
def get_todo(task_id):
    current_user_id = get_jwt_identity()

    try:
        todo = db.tasks.find_one({
            '_id': ObjectId(task_id),
            'user_id': ObjectId(current_user_id)
        })

        if todo:
            return jsonify(serialize_todo(todo))
        return jsonify({'error': 'Todo not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Invalid todo ID', 'message': str(e)}), 400

# Delete a task
@app.route('/api/todos/<task_id>', methods=['DELETE'])
@jwt_required()
def delete_todo(task_id):
    current_user_id = get_jwt_identity()

    try:
        result = db.tasks.delete_one({
            # Task ID is a string object, convert it into ObjectID, something Mongo uses
            '_id': ObjectId(task_id),
            'user_id': ObjectId(current_user_id)
        })

        # check if task was deleted using deleted_count
        # if result was deleted, this gives 1, as only 1 result is being deleted, true; else 0, false
        if result.deleted_count:
            return jsonify({'message': 'Task deleted successfully'})
        return jsonify({'error': 'Task not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Invalid todo ID', 'message': str(e)}), 400


# Update a task
# DON'T UPDATE COMPLETE HERE, update that with toggle
@app.route('/api/todos/<task_id>', methods=['PUT'])
@jwt_required()
def update_todo(task_id):
    current_user_id = get_jwt_identity()

    try:
        data = request.get_json()

        update_fields_list = {
            'updated_at': datetime.datetime.utcnow()
        }

        if 'title' in data:
            update_fields_list['title'] = data['title']
        if 'description' in data:
            update_fields_list['description'] = data['description']

        # _id and user_id will filter out one field
        # '$set' will have updated list, it will pass down that updated list and those fields will be modified only
        result = db.tasks.update_one(
            {
                '_id': ObjectId(task_id),
                'user_id': ObjectId(current_user_id)
            },
            {
                '$set': update_fields_list
            }
        )
        """
        matched_count → number of documents matched by the filter
        modified_count → number of documents actually modified (values may be the same, so modified_count could be 0 even if matched)

        So, if a task was found, that matched count will be 1 => True; (Likely to get only 1)
        Modified count if that list was updated, which it will be as always, updated_time gets updated.

        Good practise to add that. Suppose no updated_count but user somehow updates form without doing anything? Then also update will
        pass through, that is convention and notation
        """

        """
        result = {
            "acknowledged": true,
            "matched_count": 1,
            "modified_count": 1,
            "upserted_id": null
        }
        
        All your update, update_many, delete, delete_many return result in this fashion.
        Hence, here, you did not directly serialize result, you found your task again and then serialized it
        """
        if result.modified_count or result.matched_count:
            updated_todo = db.tasks.find_one({'_id': ObjectId(task_id)})
            return jsonify(serialize_todo(updated_todo))

        return jsonify({'error': 'Todo not found'}), 404
    except Exception as e:
        return jsonify({'error': 'Invalid todo ID', 'message': str(e)}), 400

"""
PUT: You send the whole object, even if you only want to change the email.

PATCH: You can send just the field you want to update:
"""

# For the sake of same url but different methods, you changed PUT to PATCH here, moreover, you are patching only
@app.route('/api/todos/<task_id>', methods=['PATCH'])
@jwt_required()
def toggle_completed(task_id):
    current_user_id = get_jwt_identity()

    try:
        task = db.tasks.find_one({'_id': ObjectId(task_id), 'user_id': ObjectId(current_user_id)})

        if not task:
            return jsonify({'error': 'Task not found'}), 404

        # dropped result = as opposed to in PUT request, eh why not? You are not using it

        db.tasks.update_one({
            '_id': ObjectId(task_id),
            'user_id': ObjectId(current_user_id),
        }, {
            '$set': {
                'updated_at': datetime.datetime.utcnow(),
                # This is a task object
                # {'_id': ObjectId('6521a1e1f1c1a1b1c1d1e1f1'), 'title': 'Buy milk', 'completed': False, 'user_id': ObjectId('6521a1f2f2c2b2c2d2e2f2f2')}
                'completed': not task['completed']
            }
        })

        updated_todo = db.tasks.find_one({'_id': ObjectId(task_id), 'user_id': ObjectId(current_user_id)})
        return jsonify(serialize_todo(updated_todo))

    except Exception as e:
        return jsonify({'error': 'Invalid todo ID', 'message': str(e)}), 400


# Delete all completed tasks
@app.route('/api/todos/delete_completed_tasks', methods=['DELETE'])
@jwt_required()
def delete_all_completed_todo():
    current_user_id = get_jwt_identity()

    result = db.tasks.delete_many({"completed": True, "user_id": ObjectId(current_user_id)})
    return jsonify({'message': f'{result.deleted_count} completed todos deleted'}), 200

# Added for fun, not really necessary. My frontend will call only specific routes
# Custom 404 handler - returns JSON instead of HTML
@app.errorhandler(404)
def not_found(err):
    return jsonify({
        'error': 'Endpoint not found',
        'message': 'The requested URL does not exist on this server',
        'status': 404
    }), 404

# Optional: Handle 405 (Method Not Allowed)
@app.errorhandler(405)
def method_not_allowed(err):
    return jsonify({
        'error': 'Method not allowed',
        'message': 'The method is not allowed for the requested URL',
        'status': 405
    }), 405


if __name__ == '__main__':
    app.run(debug=True)
