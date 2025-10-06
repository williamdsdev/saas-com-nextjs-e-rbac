import type { FastifyInstance, FastifyRequest } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'

import { UnauthorizedError } from '../routes/_errors/unauthorized-error'
import { prisma } from '@/lib/prisma'

export const auth = fastifyPlugin(async (app: FastifyInstance) => {
  app.addHook('preHandler', async (request) => {
    const req = request as FastifyRequest & {
      getCurrentUserId: () => Promise<string>
      getUserMembership: (slug: string) => Promise<{
        organization: any
        membership: any
      }>
    }

    req.getCurrentUserId = async () => {
      try {
        const { sub } = await req.jwtVerify<{ sub: string }>()
        return sub
      } catch {
        throw new UnauthorizedError('Invalid auth token')
      }
    }

    req.getUserMembership = async (slug: string) => {
      const userId = await req.getCurrentUserId()

      const member = await prisma.member.findFirst({
        where: {
          userId,
          organization: {
            slug,
          },
        },
        include: {
          organization: true,
        },
      })

      if (!member) {
        throw new UnauthorizedError(`You're not a member of this organization.`)
      }

      const { organization, ...membership } = member

      return {
        organization,
        membership,
      }
    }
  })
})
