/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the user
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 20
 *           pattern: '^[a-zA-Z0-9_]+$'
 *           description: Username (letters, numbers, and underscores only)
 *         email:
 *           type: string
 *           format: email
 *           description: Email address
 *         avatar:
 *           type: string
 *           description: URL to the user's avatar image
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *           description: List of user's skills
 *         socialLinks:
 *           type: object
 *           properties:
 *             github:
 *               type: string
 *               pattern: '^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$'
 *               description: GitHub profile URL
 *             linkedin:
 *               type: string
 *               pattern: '^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+(\/)?$'
 *               description: LinkedIn profile URL
 *         bio:
 *           type: string
 *           maxLength: 500
 *           description: User's biography
 *         isVerified:
 *           type: boolean
 *           default: false
 *           description: Whether the user's email is verified
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *         isBlocked:
 *           type: boolean
 *           default: false
 *           description: Whether the user is blocked
 *         blockUntil:
 *           type: string
 *           format: date-time
 *           description: Block expiration timestamp
 *         blockCount:
 *           type: integer
 *           default: 0
 *           description: Number of times the user has been blocked
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       required:
 *         - username
 *         - email
 *         - password
 *         - createdAt
 *         - updatedAt
 * 
 *     Workspace:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the workspace
 *         workspaceName:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           description: Name of the workspace
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Description of the workspace
 *         createdBy:
 *           type: string
 *           description: ID of the user who created the workspace
 *         inviteCode:
 *           type: string
 *           description: Unique code for inviting users to the workspace
 *         inviteUrl:
 *           type: string
 *           description: Full URL for workspace invitation
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Workspace creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       required:
 *         - workspaceName
 *         - createdBy
 *         - createdAt
 *         - updatedAt
 * 
 *     UserWorkspace:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the workspace membership
 *         userId:
 *           type: string
 *           description: ID of the user
 *         workspaceId:
 *           type: string
 *           description: ID of the workspace
 *         role:
 *           type: string
 *           enum: [owner, admin, member]
 *           default: member
 *           description: Role of the user in the workspace
 *         joinedAt:
 *           type: string
 *           format: date-time
 *           description: When the user joined the workspace
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Membership creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       required:
 *         - userId
 *         - workspaceId
 *         - role
 *         - joinedAt
 *         - createdAt
 *         - updatedAt
 * 
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           description: Error message
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 description: Field that caused the error
 *               message:
 *                 type: string
 *                 description: Error message for the field
 *       required:
 *         - success
 *         - message
 * 
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of items
 *         page:
 *           type: integer
 *           description: Current page number
 *         limit:
 *           type: integer
 *           description: Number of items per page
 *         totalPages:
 *           type: integer
 *           description: Total number of pages
 *       required:
 *         - total
 *         - page
 *         - limit
 *         - totalPages
 */ 