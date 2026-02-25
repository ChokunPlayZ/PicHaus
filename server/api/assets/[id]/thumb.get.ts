export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    const search = getRequestURL(event).search || ''
    return sendRedirect(event, `/api/assets/thumb/${id}${search}`, 308)
})
